import fs from "node:fs";
import { parse as parseYaml } from "yaml";
import { CONFIG_FILE } from "../../../server/config.ts";
const TIMEOUT_MS = 5000;

// ── Config ────────────────────────────────────────────────────────────────────

export interface CudyRouterConfig {
  type: "cudy";
  name: string;
  ip: string;
  password: string;
  enabled?: boolean;
}

export function loadCudyConfig(): CudyRouterConfig[] {
  try {
    const raw = fs.readFileSync(CONFIG_FILE, "utf8");
    const data = parseYaml(raw) as { routers: CudyRouterConfig[] };
    return (data.routers ?? []).filter((r) => r.type === "cudy" && r.enabled !== false);
  } catch {
    return [];
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CudyClient {
  mac: string;
  signal_dbm: number;
  band: "2.4G" | "5G";
  ssid: string;
  tx_rate: number;
  rx_rate: number;
  inactive_ms: number;
}

export interface CudyInterface {
  ifname: string;
  ssid: string;
  band: "2.4G" | "5G";
  channel: number;
  bitrate: number;
  clients: CudyClient[];
  bssid?: string;
  password?: string;
  standard?: string;
  width?: number;
}

export interface CudyRouterResult {
  name: string;
  ip: string;
  online: boolean;
  firmware: string;
  uptime: string;
  interfaces: CudyInterface[];
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ac.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function luciLogin(ip: string, password: string): Promise<string | null> {
  const body = new URLSearchParams({ luci_username: "admin", luci_password: password });
  try {
    const res = await fetchWithTimeout(`http://${ip}/cgi-bin/luci/`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      redirect: "manual",
    });
    const cookies = res.headers.getSetCookie?.() ?? [res.headers.get("set-cookie") ?? ""];
    for (const c of cookies) {
      const m = c.match(/sysauth=([^;]+)/i);
      if (m) return m[1];
    }
    return null;
  } catch {
    return null;
  }
}

async function luciGetJson(ip: string, token: string, path: string): Promise<unknown> {
  const url = `http://${ip}/cgi-bin/luci${path}`;
  try {
    const res = await fetchWithTimeout(url, {
      headers: { cookie: `sysauth=${token}` },
    });
    return await res.json();
  } catch {
    return null;
  }
}

async function luciRpc(ip: string, token: string, rpcPath: string, method: string, params: unknown[]): Promise<unknown> {
  const url = `http://${ip}/cgi-bin/luci${rpcPath}?auth=${token}`;
  try {
    const res = await fetchWithTimeout(url, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: `sysauth=${token}` },
      body: JSON.stringify({ id: 1, method, params }),
    });
    const json = (await res.json()) as { result?: unknown };
    return json.result ?? null;
  } catch {
    return null;
  }
}

// ── WiFi config helpers ────────────────────────────────────────────────────────

interface UciSection {
  ".type"?: string;
  ".name"?: string;
  device?: string;
  hwmode?: string;
  htmode?: string;
  ssid?: string;
  key?: string;
  disabled?: string;
}

function hwmodeToStandard(hwmode: string): string {
  const m = hwmode.toLowerCase();
  if (m.includes("be")) return "Wi-Fi 7 (802.11be)";
  if (m.includes("ax")) return "Wi-Fi 6 (802.11ax)";
  if (m.includes("ac") || m === "11ac") return "Wi-Fi 5 (802.11ac)";
  if (m.includes("na") || (m.includes("n") && m.includes("a"))) return "Wi-Fi 4 (802.11n)";
  if (m.includes("ng") || (m.includes("n") && m.includes("g"))) return "Wi-Fi 4 (802.11n)";
  if (m.includes("a")) return "802.11a";
  if (m.includes("g")) return "802.11g";
  if (m.includes("b")) return "802.11b";
  return hwmode;
}

function htmodeToWidth(htmode: string): number {
  const m = htmode.toUpperCase();
  if (m.includes("320")) return 320;
  if (m.includes("160")) return 160;
  if (m.includes("80")) return 80;
  if (m.includes("40")) return 40;
  return 20;
}

interface IfaceWifiConfig {
  bssid?: string;
  password?: string;
  standard?: string;
  width?: number;
}

async function fetchWifiConfig(ip: string, token: string, ifnames: string[]): Promise<Map<string, IfaceWifiConfig>> {
  const result = new Map<string, IfaceWifiConfig>();

  // UCI: password, standard (hwmode), width (htmode)
  const uciRaw = await luciRpc(ip, token, "/rpc/uci", "get_all", ["wireless"]);
  const uciSections = (uciRaw ?? {}) as Record<string, UciSection>;

  // Build map: ssid → { password, standard, width } from UCI
  const deviceMap = new Map<string, { standard?: string; width?: number }>();
  const ifaceMap = new Map<string, { password?: string; deviceRef?: string }>();
  for (const [, sec] of Object.entries(uciSections)) {
    if (sec[".type"] === "wifi-device") {
      deviceMap.set(sec[".name"] ?? "", {
        standard: sec.hwmode ? hwmodeToStandard(sec.hwmode) : undefined,
        width: sec.htmode ? htmodeToWidth(sec.htmode) : undefined,
      });
    } else if (sec[".type"] === "wifi-iface") {
      ifaceMap.set(sec.ssid ?? "", {
        password: sec.key,
        deviceRef: sec.device,
      });
    }
  }

  // iwinfo: BSSID per interface
  const bssidResults = await Promise.all(
    ifnames.map((ifname) => luciRpc(ip, token, "/rpc/iwinfo", "info", [ifname]))
  );

  for (let i = 0; i < ifnames.length; i++) {
    const ifname = ifnames[i];
    const info = bssidResults[i] as { bssid?: string; ssid?: string } | null;
    const bssid = info?.bssid;
    const ssid = info?.ssid ?? "";
    const ifaceConfig = ifaceMap.get(ssid);
    const devConfig = ifaceConfig?.deviceRef ? deviceMap.get(ifaceConfig.deviceRef) : undefined;
    result.set(ifname, {
      bssid,
      password: ifaceConfig?.password,
      standard: devConfig?.standard,
      width: devConfig?.width,
    });
  }

  return result;
}

// ── Fetcher ───────────────────────────────────────────────────────────────────

interface LuciWifiEntry {
  ifname?: string;
  ssid?: string;
  channel?: number;
  bitrate?: number;
  frequency?: string;
  up?: boolean;
  mode?: string;
  multissid?: boolean;
  assoclist?: Record<string, { signal?: number; tx_rate?: number; rx_rate?: number; inactive?: number }>;
}

interface LuciStats {
  mode?: string;
  wifi?: LuciWifiEntry[];
}

export async function fetchCudyRouter(cfg: CudyRouterConfig): Promise<CudyRouterResult> {
  const result: CudyRouterResult = {
    name: cfg.name,
    ip: cfg.ip,
    online: false,
    firmware: "",
    uptime: "",
    interfaces: [],
  };

  const token = await luciLogin(cfg.ip, cfg.password);
  if (!token) return result;
  result.online = true;

  const stats = (await luciGetJson(cfg.ip, token, "/admin/status/statistic")) as LuciStats | null;
  if (stats?.wifi) {
    for (const w of stats.wifi) {
      if (!w.up || w.multissid || w.mode !== "Master") continue;
      const band: "2.4G" | "5G" = (w.channel ?? 0) <= 14 ? "2.4G" : "5G";
      const iface: CudyInterface = {
        ifname: w.ifname ?? "",
        ssid: w.ssid ?? "",
        band,
        channel: w.channel ?? 0,
        bitrate: w.bitrate ?? 0,
        clients: [],
      };
      if (w.assoclist && typeof w.assoclist === "object") {
        for (const [mac, c] of Object.entries(w.assoclist)) {
          iface.clients.push({
            mac: mac.toUpperCase(),
            signal_dbm: -(c.signal ?? 0),
            band,
            ssid: iface.ssid,
            tx_rate: c.tx_rate ?? 0,
            rx_rate: c.rx_rate ?? 0,
            inactive_ms: c.inactive ?? 0,
          });
        }
      }
      result.interfaces.push(iface);
    }
  }

  if (result.interfaces.length > 0) {
    const wifiConfig = await fetchWifiConfig(cfg.ip, token, result.interfaces.map((i) => i.ifname));
    for (const iface of result.interfaces) {
      const details = wifiConfig.get(iface.ifname);
      if (details) {
        iface.bssid = details.bssid;
        iface.password = details.password;
        iface.standard = details.standard;
        iface.width = details.width;
      }
    }
  }

  return result;
}

export async function fetchAllCudyRouters(): Promise<CudyRouterResult[]> {
  const configs = loadCudyConfig();
  return Promise.all(configs.map(fetchCudyRouter));
}

// [[timestamp_us, bytesUp, packetsUp, bytesDown, packetsDown], ...]
// Values are cumulative — compute rate as delta/dt between consecutive samples.
type RawBandwidthRow = [number, number, number, number, number];

function parseBandwidth(raw: unknown): import("../../contracts.ts").CudyBandwidthPoint[] {
  if (!Array.isArray(raw)) return [];
  const rows = (raw as RawBandwidthRow[]).filter((r) => Array.isArray(r) && r.length >= 5);
  const points: import("../../contracts.ts").CudyBandwidthPoint[] = [];
  for (let i = 1; i < rows.length; i++) {
    const [ts0, up0, , down0] = rows[i - 1];
    const [ts1, up1, , down1] = rows[i];
    const dtSec = (ts1 - ts0) / 1_000_000;
    if (dtSec <= 0) continue;
    points.push({
      ts: Math.floor(ts1 / 1_000_000),
      up: Math.round((up1 - up0) / dtSec * 8 / 1000),
      down: Math.round((down1 - down0) / dtSec * 8 / 1000),
    });
  }
  return points;
}

interface DevlistEntry {
  iface: string;
  ip: string;
  mac: string;
  tx_kbps: number;
  rx_kbps: number;
  signal: string | null;
  duration: string;
}

function parseDevlistHtml(html: string): DevlistEntry[] {
  const rows = html.match(/<tr id="cbi-table-\d+"[\s\S]*?(?=<tr id="cbi-table-|\s*<\/tbody>)/g) ?? [];
  return rows.map((row) => {
    const field = (name: string) => {
      const m = row.match(new RegExp(`id="cbi-table-\\d+-${name}">[\\s\\S]*?<p class="form-control-static hidden-xs">(.*?)<\\/p>`, "s"));
      return m ? m[1].trim() : "";
    };

    const iface = field("iface").replace(/<[^>]+>/g, "").trim();

    const ipmac = field("ipmac");
    const ipmacParts = ipmac.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").trim().split("\n");
    const ip = ipmacParts[0]?.trim() ?? "";
    const mac = ipmacParts[1]?.trim().toUpperCase() ?? "";

    const speed = field("speed").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "");
    const txMatch = speed.match(/([\d.]+)\s*Kbps/);
    const rxMatch = speed.match(/[\s\S]*([\d.]+)\s*Kbps/);
    const tx_kbps = txMatch ? parseFloat(txMatch[1]) : 0;
    const rx_kbps = rxMatch ? parseFloat(rxMatch[1]) : 0;

    const rawSignal = field("signal").replace(/<[^>]+>/g, "").trim();
    const signal = rawSignal === "---" || rawSignal === "" ? null : rawSignal;

    const duration = field("online").replace(/<[^>]+>/g, "").trim();

    return { iface, ip, mac, tx_kbps, rx_kbps, signal, duration };
  }).filter((e) => e.ip !== "");
}

export async function fetchCudyDevlist(cfg: CudyRouterConfig): Promise<DevlistEntry[] | null> {
  const token = await luciLogin(cfg.ip, cfg.password);
  if (!token) return null;
  const url = `http://${cfg.ip}/cgi-bin/luci/admin/network/devices/devlist`;
  try {
    const res = await fetchWithTimeout(url, { headers: { cookie: `sysauth=${token}` } });
    return parseDevlistHtml(await res.text());
  } catch {
    return null;
  }
}

export async function fetchCudyBandwidth(
  cfg: CudyRouterConfig,
): Promise<import("../../contracts.ts").CudyBandwidthData> {
  const token = await luciLogin(cfg.ip, cfg.password);
  if (!token) return { ra0: [], rai0: [] };

  const [ra0Raw, rai0Raw] = await Promise.all([
    luciGetJson(cfg.ip, token, "/admin/status/bandwidth?iface=ra0"),
    luciGetJson(cfg.ip, token, "/admin/status/bandwidth?iface=rai0"),
  ]);

  return { ra0: parseBandwidth(ra0Raw), rai0: parseBandwidth(rai0Raw) };
}
