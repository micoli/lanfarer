import { createHash } from "node:crypto";
import fs from "node:fs";
import { parse as parseYaml } from "yaml";
import { CONFIG_FILE } from "../../../server/config.ts";

const TIMEOUT_MS = 5000;

// ── Config ────────────────────────────────────────────────────────────────────

export interface KuwfiRouterConfig {
  type: "kuwfi";
  name: string;
  ip: string;
  password: string;
  enabled?: boolean;
}

export function loadKuwfiConfig(): KuwfiRouterConfig[] {
  try {
    const raw = fs.readFileSync(CONFIG_FILE, "utf8");
    const data = parseYaml(raw) as { routers: KuwfiRouterConfig[] };
    return (data.routers ?? []).filter((r) => r.type === "kuwfi" && r.enabled !== false);
  } catch {
    return [];
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface KuwfiClient {
  mac: string;
  ip: string;
  signal_dbm: number;
  band: "2.4G" | "5G";
  ssid: string;
}

export interface KuwfiAccessPoint {
  ssid: string;
  band: "2.4G" | "5G";
  channel: number;
  clients: KuwfiClient[];
}

export interface KuwfiRouterResult {
  name: string;
  ip: string;
  online: boolean;
  firmware: string;
  uptime: number;
  accessPoints: KuwfiAccessPoint[];
}

// ── HTTP helpers ───────────────────────────────────────────────────────────────

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ac.signal });
  } finally {
    clearTimeout(timer);
  }
}

function md5(s: string): string {
  return createHash("md5").update(s).digest("hex");
}

async function kuwfiLogin(ip: string, password: string): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(`http://${ip}/cgi-bin/login`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: `opcode=1&username=admin&password=${md5(password)}`,
    });
    const data = (await res.json()) as { result?: string; token?: string };
    if (data.result !== "1" || !data.token) return null;

    // MAC auth step required by the firmware session flow
    await fetchWithTimeout(`http://${ip}/cgi-bin/login`, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        cookie: `stork=${data.token}`,
      },
      body: "opcode=3",
    });

    return data.token;
  } catch {
    return null;
  }
}

async function kuwfiPost(
  ip: string,
  token: string,
  endpoint: string,
  params: string,
): Promise<unknown> {
  const interval = Date.now();
  try {
    const res = await fetchWithTimeout(`http://${ip}/cgi-bin/${endpoint}`, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        cookie: `stork=${token}`,
      },
      body: `${params}&interval=${interval}`,
    });
    return await res.json();
  } catch {
    return null;
  }
}

// ── Parsers ───────────────────────────────────────────────────────────────────

interface RawSysinfo1 {
  FIRMVERSION?: string;
  PRODUCTNAME?: string;
}

interface RawSysinfo2 {
  system_up_time?: string;
}

interface RawWirelessStatus {
  [key: string]: string | undefined;
}

interface RawClientEntry {
  MAC?: string;
  IP?: string;
  SIGNAL?: string | number;
  mac?: string;
  ip?: string;
  signal?: string | number;
}

interface RawClientList {
  ItemList?: {
    data?: RawClientEntry[];
    count?: string | number;
  };
}

function parseClients(
  raw: unknown,
  ssid: string,
  band: "2.4G" | "5G",
): KuwfiClient[] {
  const list = raw as RawClientList;
  const entries = list?.ItemList?.data ?? [];
  const clients: KuwfiClient[] = [];
  for (const e of entries) {
    const mac = (e.MAC ?? e.mac ?? "").toUpperCase().trim();
    if (!mac || mac === "00:00:00:00:00:00") continue;
    const ip = e.IP ?? e.ip ?? "";
    const rawSignal = Number(e.SIGNAL ?? e.signal ?? 0);
    // Firmware reports positive integer; treat as absolute dBm value
    const signal_dbm = rawSignal > 0 ? -rawSignal : rawSignal;
    clients.push({ mac, ip, signal_dbm, band, ssid });
  }
  return clients;
}

function channelToBand(channel: number): "2.4G" | "5G" {
  return channel > 14 ? "5G" : "2.4G";
}

// ── Fetcher ───────────────────────────────────────────────────────────────────

export async function fetchKuwfiRouter(cfg: KuwfiRouterConfig): Promise<KuwfiRouterResult> {
  const result: KuwfiRouterResult = {
    name: cfg.name,
    ip: cfg.ip,
    online: false,
    firmware: "",
    uptime: 0,
    accessPoints: [],
  };

  const token = await kuwfiLogin(cfg.ip, cfg.password);
  if (!token) return result;
  result.online = true;

  const [info1Raw, info2Raw, wifiStatusRaw] = await Promise.all([
    kuwfiPost(cfg.ip, token, "sysinfo", "opcode=1"),
    kuwfiPost(cfg.ip, token, "sysinfo", "opcode=2"),
    kuwfiPost(cfg.ip, token, "wireless_status", "opcode=2&wlanid=0"),
  ]);

  const info1 = info1Raw as RawSysinfo1 | null;
  const info2 = info2Raw as RawSysinfo2 | null;
  const wifiStatus = wifiStatusRaw as RawWirelessStatus | null;

  result.firmware = info1?.FIRMVERSION ?? "";
  result.uptime = Number(info2?.system_up_time ?? 0);

  // Build access points from wireless_status VAP entries
  const accessPointMap = new Map<number, KuwfiAccessPoint>();
  if (wifiStatus) {
    // Find all wlan indices (WLAN0, WLAN1, ...)
    const wlanIndices = new Set<number>();
    for (const key of Object.keys(wifiStatus)) {
      const m = key.match(/^WLAN(\d+)_CHANNEL$/);
      if (m) wlanIndices.add(Number(m[1]));
    }

    for (const wlanIdx of wlanIndices) {
      const channel = Number(wifiStatus[`WLAN${wlanIdx}_CHANNEL`] ?? 0);
      const band = channelToBand(channel);

      // Find VAP entries for this radio
      const vapIndices = new Set<number>();
      for (const key of Object.keys(wifiStatus)) {
        const m = key.match(new RegExp(`^WLAN${wlanIdx}_VAP(\\d+)_SSID$`));
        if (m) vapIndices.add(Number(m[1]));
      }

      for (const vapIdx of vapIndices) {
        const rfKey = `WLAN${wlanIdx}_VAP${vapIdx}_PRERF`;
        if (wifiStatus[rfKey] !== "1") continue;
        const ssid = wifiStatus[`WLAN${wlanIdx}_VAP${vapIdx}_SSID`] ?? "";
        if (!ssid) continue;

        const apKey = wlanIdx * 10 + vapIdx;
        accessPointMap.set(apKey, { ssid, band, channel, clients: [] });
      }
    }
  }

  // If no VAPs found from status, create a default AP
  if (accessPointMap.size === 0) {
    accessPointMap.set(0, { ssid: "", band: "5G", channel: 0, clients: [] });
  }

  // Fetch clients for each wlan
  const wlanIndices = new Set<number>();
  for (const [key] of accessPointMap) {
    wlanIndices.add(Math.floor(key / 10));
  }

  for (const wlanIdx of wlanIndices) {
    const clientsRaw = await kuwfiPost(
      cfg.ip,
      token,
      "wireless_clientlist",
      `opcode=1&wlanid=${wlanIdx}`,
    );

    // Assign clients to the matching AP for this wlan
    for (const [apKey, ap] of accessPointMap) {
      if (Math.floor(apKey / 10) === wlanIdx) {
        ap.clients = parseClients(clientsRaw, ap.ssid, ap.band);
        break;
      }
    }
  }

  result.accessPoints = [...accessPointMap.values()];
  return result;
}

export async function fetchAllKuwfiRouters(): Promise<KuwfiRouterResult[]> {
  const configs = loadKuwfiConfig();
  return Promise.all(configs.map(fetchKuwfiRouter));
}

// ── Bandwidth ─────────────────────────────────────────────────────────────────

interface RawThroughputEntry {
  name: string;
  data: string[];
}

interface RawSystemThroughput {
  WanThroughput?: {
    Throughput?: RawThroughputEntry[];
  };
}

async function fetchKuwfiThroughputSeries(
  ip: string,
  token: string,
  wlanid: number,
): Promise<import("../../contracts.ts").KuwfiBandwidthPoint[]> {
  try {
    const res = await fetchWithTimeout(`http://${ip}/cgi-bin/system_throughput?wlanid=${wlanid}`, {
      headers: { cookie: `stork=${token}` },
    });
    const json = (await res.json()) as RawSystemThroughput;
    const entries = json.WanThroughput?.Throughput?.filter((e) => e.data.length > 0) ?? [];
    if (entries.length === 0) return [];

    const len = Math.max(...entries.map((e) => e.data.length));
    const now = Math.floor(Date.now() / 1000);

    return Array.from({ length: len }, (_, i) => {
      const bytesPerSec = entries.reduce((sum, e) => sum + Number(e.data[i] ?? 0), 0);
      return {
        ts: now - (len - 1 - i),
        up: 0,
        down: Math.round((bytesPerSec * 8) / 1000),
      };
    });
  } catch {
    return [];
  }
}

export async function fetchKuwfiBandwidth(
  cfg: KuwfiRouterConfig,
): Promise<import("../../contracts.ts").KuwfiBandwidthData> {
  const token = await kuwfiLogin(cfg.ip, cfg.password);
  if (!token) return { band24: [], band5: [] };

  const [band24, band5] = await Promise.all([
    fetchKuwfiThroughputSeries(cfg.ip, token, 0),
    fetchKuwfiThroughputSeries(cfg.ip, token, 1),
  ]);

  return { band24, band5 };
}
