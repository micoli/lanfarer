import fs from "node:fs";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { parse as parseYaml } from "yaml";
import { CONFIG_FILE } from "../../../server/config.ts";
import { checkAcpOnline, fetchAcpHosts } from "./acp-client.ts";

const execAsync = promisify(exec);

export async function fetchLocalArpMap(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const { stdout } = await execAsync("arp -a -n");
    for (const line of stdout.split("\n")) {
      const m = line.match(/\((\d+\.\d+\.\d+\.\d+)\)\s+at\s+([0-9a-f:-]{11,17})/i);
      if (!m) continue;
      const ip = m[1];
      const mac = m[2].split(/[:-]/).map((b) => b.padStart(2, "0")).join(":").toUpperCase();
      map.set(mac, ip);
    }
  } catch { /* arp unavailable */ }
  return map;
}

// ── Config ────────────────────────────────────────────────────────────────────

export interface AirportRouterConfig {
  type: "airport";
  name: string;
  ip: string;
  password?: string;
  enabled?: boolean;
}

export function loadAirportConfig(): AirportRouterConfig[] {
  try {
    const raw = fs.readFileSync(CONFIG_FILE, "utf8");
    const data = parseYaml(raw) as { routers: AirportRouterConfig[] };
    return (data.routers ?? []).filter((r) => r.type === "airport" && r.enabled !== false);
  } catch {
    return [];
  }
}

// ── Host type ─────────────────────────────────────────────────────────────────

export interface AirportHost {
  mac: string;
  ip: string;
  hostname: string;
  wireless: boolean;
}

// ── Public fetchers ───────────────────────────────────────────────────────────

export interface AirportRouterResult {
  name: string;
  ip: string;
  online: boolean;
  hosts: AirportHost[];
}

export async function fetchAirportRouter(cfg: AirportRouterConfig): Promise<AirportRouterResult> {
  const result: AirportRouterResult = { name: cfg.name, ip: cfg.ip, online: false, hosts: [] };
  try {
    result.online = await checkAcpOnline(cfg.ip);
    if (!result.online) return result;

    const [{ hosts }, arpMap] = await Promise.all([
      fetchAcpHosts(cfg.ip, cfg.password ?? ""),
      fetchLocalArpMap(),
    ]);
    for (const h of hosts) {
      if (!h.ip) h.ip = arpMap.get(h.mac.toUpperCase()) ?? "";
    }
    result.hosts.push(...hosts);
  } catch {
    result.online = false;
  }
  return result;
}

export async function fetchAllAirportRouters(): Promise<AirportRouterResult[]> {
  const configs = loadAirportConfig();
  return Promise.all(configs.map(fetchAirportRouter));
}

// ── Wifi settings ─────────────────────────────────────────────────────────────

export interface AirportWifiInterface {
  ifIndex: number;
  description: string;
  clientCount: number;
}

export interface AirportWifiSettings {
  interfaces: AirportWifiInterface[];
}

export async function fetchAirportWifiSettings(_cfg: AirportRouterConfig): Promise<AirportWifiSettings> {
  return { interfaces: [] };
}
