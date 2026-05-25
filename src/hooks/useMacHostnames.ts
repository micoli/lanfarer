import { useMemo } from "react";
import { useHosts } from "./useBbox";

interface Host {
  hostname?: string;
  macaddress?: string;
  [k: string]: unknown;
}

function parseHosts(raw: unknown): Host[] {
  if (!raw) return [];
  if (Array.isArray(raw) && raw[0]?.hosts?.list) return raw[0].hosts.list as Host[];
  if (Array.isArray(raw) && raw[0]?.hosts && Array.isArray(raw[0].hosts)) return raw[0].hosts as Host[];
  if (Array.isArray(raw)) return raw as Host[];
  return [];
}

function normalizeMac(mac: string): string {
  return mac.toUpperCase().replace(/-/g, ":");
}

export function useMacHostnames(routerId: string | null): (mac: string) => string | undefined {
  const { data } = useHosts(routerId);

  const map = useMemo(() => {
    const m = new Map<string, string>();
    for (const h of parseHosts(data)) {
      if (h.macaddress && h.hostname) {
        m.set(normalizeMac(h.macaddress), h.hostname);
      }
    }
    return m;
  }, [data]);

  return (mac: string) => map.get(normalizeMac(mac));
}
