import { useMemo } from "react";
import { useHosts } from "./useBbox";

function normalizeMac(mac: string): string {
  return mac.toUpperCase().replace(/-/g, ":");
}

export function useMacHostnames(routerId: string | null): (mac: string) => string | undefined {
  const { data } = useHosts(routerId);

  const map = useMemo(() => {
    const m = new Map<string, string>();
    for (const h of data?.hosts ?? []) {
      if (h.mac && h.hostname) {
        m.set(normalizeMac(h.mac), h.hostname);
      }
    }
    return m;
  }, [data]);

  return (mac: string) => map.get(normalizeMac(mac));
}
