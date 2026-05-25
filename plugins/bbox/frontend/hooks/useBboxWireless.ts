import { useMemo } from "react";
import { useHosts, useWireless } from "./useBbox";

export interface BboxStation {
  macaddress: string;
  hostname?: string;
  ipaddress?: string;
  rssi?: number;
  frequency?: string;
  txRate?: number | string;
  rxRate?: number | string;
  active?: number;
  [k: string]: unknown;
}

export interface BboxWirelessHost {
  ssid?: string;
  band?: string;
  frequency?: string;
  ifname?: string;
  guest?: number;
  compatibility?: number;
  stations: BboxStation[];
  [k: string]: unknown;
}

interface WirelessSsid {
  id?: string;
  [k: string]: unknown;
}

interface WirelessData {
  ssid?: {
    "24"?: WirelessSsid;
    "5"?: WirelessSsid;
    guest?: WirelessSsid;
    compatibility?: WirelessSsid;
  };
}

function parseWirelessData(raw: unknown): WirelessData | null {
  return (raw as { wireless?: WirelessData }[])?.[0]?.wireless ?? null;
}

const BAND_KEYS: ["24", "5"] = ["24", "5"];

function mergeGroup(
  list: BboxWirelessHost[],
  ssidKey: "24" | "5" | "guest" | "compatibility" | null,
  wireless: WirelessData
): BboxWirelessHost | null {
  if (list.length === 0) return null;

  const ssid = wireless.ssid?.[ssidKey ?? "24"]?.id ?? list[0].ssid;

  const stations = list.flatMap((entry, i) => {
    const frequency = (BAND_KEYS[i] ?? "5") === "24" ? "2.4G" : "5G";
    return entry.stations.map((s) => ({ ...s, frequency }));
  });

  return { ...list[0], ssid, frequency: undefined, stations };
}

export function useBboxWirelessHosts(routerId: string | null): BboxWirelessHost[] {
  const { data: hostsData } = useHosts(routerId);
  const { data: wirelessData } = useWireless(routerId);

  return useMemo(() => {
    if (!Array.isArray(hostsData) || !hostsData[0]?.wirelesshosts) return [];
    const wh = hostsData[0].wirelesshosts as BboxWirelessHost[];
    const entries = wh.filter(
      (entry) => Array.isArray(entry.stations) && entry.stations.length > 0
    );

    const wireless = parseWirelessData(wirelessData);
    if (!wireless) return entries;

    const main = entries.filter((e) => !e.guest && !e.compatibility);
    const guest = entries.filter((e) => e.guest);
    const compat = entries.filter((e) => e.compatibility);

    return [
      mergeGroup(main, null, wireless),
      mergeGroup(guest, "guest", wireless),
      mergeGroup(compat, "compatibility", wireless),
    ].filter(Boolean) as BboxWirelessHost[];
  }, [hostsData, wirelessData]);
}
