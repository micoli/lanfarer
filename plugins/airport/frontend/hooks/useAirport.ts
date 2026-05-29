import { useQuery } from "@tanstack/react-query";
import { basePath } from "../../../../src/lib/basePath.ts";
import type { Host, HostsData } from "../../../contracts.ts";

export interface AcpDeviceInfo {
  laMA?: string;
  raMA?: string;
  waMA?: string;
  features?: string[];
}

export function useAirportDeviceInfo(routerId: string | null) {
  return useQuery<AcpDeviceInfo>({
    queryKey: ["airport", "device-info", routerId],
    queryFn: async () => {
      const res = await fetch(`${basePath()}/devices/api-proxy/airport-proxy/${routerId}/device-info`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<AcpDeviceInfo>;
    },
    staleTime: 300_000,
    enabled: routerId !== null,
  });
}

export interface AirportWifiInterface {
  ifIndex: number;
  description: string;
  clientCount: number;
}

export interface AirportWifiSettings {
  interfaces: AirportWifiInterface[];
}

export function useAirportWifiSettings(routerId: string | null) {
  return useQuery<AirportWifiSettings>({
    queryKey: ["airport", "wifi-settings", routerId],
    queryFn: async () => {
      const res = await fetch(`${basePath()}/devices/api-proxy/airport-proxy/${routerId}/wifi-settings`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<AirportWifiSettings>;
    },
    staleTime: 60_000,
    enabled: routerId !== null,
  });
}

export interface AirportWifiClient {
  mac: string;
  ip: string;
  hostname: string;
  rssi_dbm: number;
  txrate_mbps: number;
}

export interface AirportAccessPoint {
  ifname: string;
  ssid: string;
  band: "2.4G" | "5G";
  channel: number;
  clients: AirportWifiClient[];
}

export interface AirportWirelessData {
  online: boolean;
  accessPoints: AirportAccessPoint[];
}

export function useAirportWireless(routerId: string | null) {
  return useQuery<AirportWirelessData>({
    queryKey: ["airport", "wireless", routerId],
    queryFn: async () => {
      const res = await fetch(`${basePath()}/devices/api-proxy/airport-proxy/${routerId}/wireless`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<AirportWirelessData>;
    },
    refetchInterval: 30_000,
    enabled: routerId !== null,
  });
}

interface AirportArpEntry {
  mac: string;
  ip: string;
  wireless: boolean;
}

export interface AirportHostsData extends HostsData {
  online: boolean;
}

export function useAirportHosts(routerId: string | null) {
  return useQuery<AirportHostsData>({
    queryKey: ["airport", "hosts", routerId],
    queryFn: async () => {
      const res = await fetch(`${basePath()}/devices/api-proxy/airport-proxy/${routerId}/hosts`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as { online: boolean; hosts: AirportArpEntry[] };
      const hosts: Host[] = body.hosts.map((e) => ({
        mac: e.mac,
        ip: e.ip,
        hostname: "",
        active: true,
        connexion: e.wireless ? "wifi 2.4G" : "wired",
      }));
      return { online: body.online, hosts };
    },
    refetchInterval: 30_000,
    enabled: routerId !== null,
  });
}
