import { useMemo } from "react";
import { useHosts } from "./useBbox";

export interface BboxStation {
  macaddress: string;
  hostname?: string;
  ipaddress?: string;
  rssi?: number;
  active?: number;
  [k: string]: unknown;
}

export interface BboxWirelessHost {
  ssid?: string;
  band?: string;
  ifname?: string;
  stations: BboxStation[];
  [k: string]: unknown;
}

export function useBboxWirelessHosts(): BboxWirelessHost[] {
  const { data } = useHosts();

  return useMemo(() => {
    if (!Array.isArray(data) || !data[0]?.wirelesshosts) return [];
    const wh = data[0].wirelesshosts as unknown[];
    return (wh as BboxWirelessHost[]).filter(
      (entry) => Array.isArray(entry.stations) && entry.stations.length > 0,
    );
  }, [data]);
}
