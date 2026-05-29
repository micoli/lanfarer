import fs from "node:fs";
import { parse as parseYaml } from "yaml";
import { CONFIG_FILE } from "../../../server/config.ts";
import { checkAcpOnline, fetchAcpHosts } from "./acp-client.ts";

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

    const { hosts } = await fetchAcpHosts(cfg.ip, cfg.password ?? "");
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
