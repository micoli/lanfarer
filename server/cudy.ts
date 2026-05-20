import fs from "node:fs";
import { parse as parseYaml } from "yaml";
import { CONFIG_FILE } from "./config.ts";
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
  try {
    const res = await fetchWithTimeout(`http://${ip}/cgi-bin/luci${path}`, {
      headers: { cookie: `sysauth=${token}` },
    });
    return await res.json();
  } catch {
    return null;
  }
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

  return result;
}

export async function fetchAllCudyRouters(): Promise<CudyRouterResult[]> {
  const configs = loadCudyConfig();
  return Promise.all(configs.map(fetchCudyRouter));
}
