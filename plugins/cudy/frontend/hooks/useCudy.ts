import { useQueries, useQuery } from "@tanstack/react-query";
import { basePath } from "../../../../src/lib/basePath.ts";

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

export interface CudyRouter {
  name: string;
  ip: string;
  online: boolean;
  firmware: string;
  uptime: string;
  interfaces: CudyInterface[];
}

function useCudyRouterList() {
  return useQuery({
    queryKey: ["cudy", "list"],
    queryFn: async () => {
      const res = await fetch(`${basePath()}/__cudy/status`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<{ routers: { name: string; ip: string }[] }>;
    },
    staleTime: 60_000,
  });
}

export function useCudyClients() {
  const { data: list } = useCudyRouterList();
  const routerNames = list?.routers.map((r) => r.name) ?? [];

  return useQueries({
    queries: routerNames.map((name) => ({
      queryKey: ["cudy", "clients", name],
      queryFn: async (): Promise<CudyRouter> => {
        const res = await fetch(`${basePath()}/devices/api-proxy/cudy-proxy/${name}/clients`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<CudyRouter>;
      },
      refetchInterval: 30_000,
    })),
    combine: (results) => ({
      data: { routers: results.map((r) => r.data).filter(Boolean) as CudyRouter[] },
      isLoading: results.some((r) => r.isLoading),
      error: results.find((r) => r.error)?.error ?? null,
    }),
  });
}
