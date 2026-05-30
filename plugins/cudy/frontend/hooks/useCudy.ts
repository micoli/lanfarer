import { useQueries, useQuery } from "@tanstack/react-query";
import { basePath } from "../../../../src/lib/basePath.ts";
import type { CudyBandwidthData, Host, HostConnexion, HostsData, WirelessData } from "../../../contracts.ts";

interface DevlistEntry {
  iface: string;
  ip: string;
  mac: string;
  tx_kbps: number;
  rx_kbps: number;
  signal: string | null;
  duration: string;
}

export interface CudyRouterWireless {
  name: string;
  ip: string;
  wireless: WirelessData;
}

function useCudyRouterList() {
  return useQuery({
    queryKey: ["cudy", "list"],
    queryFn: async () => {
      const res = await fetch(`${basePath()}/devices/api-proxy/cudy/status`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<{ routers: { name: string; ip: string }[] }>;
    },
    staleTime: 60_000,
  });
}

export function useCudyBandwidth(routerName: string | null) {
  return useQuery<CudyBandwidthData>({
    queryKey: ["cudy", "bandwidth", routerName],
    queryFn: async () => {
      const res = await fetch(`${basePath()}/devices/api-proxy/cudy/${routerName}/bandwidth`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<CudyBandwidthData>;
    },
    refetchInterval: 30_000,
    enabled: routerName !== null,
  });
}

export function useCudyHosts(routerId: string | null) {
  return useQuery<HostsData>({
    queryKey: ["cudy", "hosts", routerId],
    queryFn: async () => {
      const res = await fetch(`${basePath()}/devices/api-proxy/cudy/${routerId}/devlist`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const entries = (await res.json()) as DevlistEntry[];
      const toConnexion = (iface: string): HostConnexion => {
        if (/5g/i.test(iface)) return "wifi 5G";
        if (/2\.4g|wifi/i.test(iface)) return "wifi 2.4G";
        return "wired";
      };
      const hosts: Host[] = entries.map((e) => ({
        mac: e.mac,
        ip: e.ip,
        hostname: "",
        active: true,
        connexion: toConnexion(e.iface),
      }));
      return { hosts };
    },
    refetchInterval: 30_000,
    enabled: routerId !== null,
  });
}

export function useCudyClients() {
  const { data: list } = useCudyRouterList();
  const routers = list?.routers ?? [];

  return useQueries({
    queries: routers.map((router) => ({
      queryKey: ["cudy", "wireless", router.name],
      queryFn: async (): Promise<CudyRouterWireless> => {
        const res = await fetch(
          `${basePath()}/devices/api-proxy/cudy/${router.name}/wireless`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const wireless = (await res.json()) as WirelessData;
        return { name: router.name, ip: router.ip, wireless };
      },
      refetchInterval: 30_000,
    })),
    combine: (results) => ({
      data: {
        routers: results.map((r) => r.data).filter(Boolean) as CudyRouterWireless[],
      },
      isLoading: results.some((r) => r.isLoading),
      error: results.find((r) => r.error)?.error ?? null,
    }),
  });
}
