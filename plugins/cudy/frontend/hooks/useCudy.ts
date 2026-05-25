import { useQueries, useQuery } from "@tanstack/react-query";
import { basePath } from "../../../../src/lib/basePath.ts";
import type { CudyBandwidthData, WirelessData } from "../../../contracts.ts";

export interface CudyRouterWireless {
  name: string;
  ip: string;
  wireless: WirelessData;
}

function useCudyRouterList() {
  return useQuery({
    queryKey: ["cudy", "list"],
    queryFn: async () => {
      const res = await fetch(`${basePath()}/devices/api-proxy/cudy-proxy/status`);
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
      const res = await fetch(`${basePath()}/devices/api-proxy/cudy-proxy/${routerName}/bandwidth`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<CudyBandwidthData>;
    },
    refetchInterval: 30_000,
    enabled: routerName !== null,
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
          `${basePath()}/devices/api-proxy/cudy-proxy/${router.name}/wireless`
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
