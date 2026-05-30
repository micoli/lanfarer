import { useQueries, useQuery } from "@tanstack/react-query";
import { apiClient, apiFetch } from "../../../../src/lib/api/client.ts";
import type { components } from "../../../../src/lib/api/schema.d.ts";
import type { HostConnexion } from "../../../contracts.ts";

type CudyBandwidthData = components["schemas"]["CudyBandwidthData"];
type WirelessData = components["schemas"]["WirelessData"];
type CudyDevlistEntry = components["schemas"]["CudyDevlistEntry"];

export interface CudyRouterWireless {
  name: string;
  ip: string;
  wireless: WirelessData;
}

function useCudyRouterList() {
  return useQuery({
    queryKey: ["cudy", "list"],
    queryFn: () => apiFetch(apiClient.GET("/devices/api-proxy/cudy/status")),
    staleTime: 60_000,
  });
}

export function useCudyBandwidth(routerName: string | null) {
  return useQuery<CudyBandwidthData>({
    queryKey: ["cudy", "bandwidth", routerName],
    queryFn: () =>
      apiFetch(
        apiClient.GET("/devices/api-proxy/cudy/{routerId}/bandwidth", {
          params: { path: { routerId: routerName! } },
        }),
      ),
    refetchInterval: 30_000,
    enabled: routerName !== null,
  });
}

export function useCudyHosts(routerId: string | null) {
  return useQuery({
    queryKey: ["cudy", "hosts", routerId],
    queryFn: async () => {
      const entries = await apiFetch(
        apiClient.GET("/devices/api-proxy/cudy/{routerId}/devlist", {
          params: { path: { routerId: routerId! } },
        }),
      ) as CudyDevlistEntry[];
      const toConnexion = (iface: string): HostConnexion => {
        if (/5g/i.test(iface)) return "wifi 5G";
        if (/2\.4g|wifi/i.test(iface)) return "wifi 2.4G";
        return "wired";
      };
      return {
        hosts: entries.map((e) => ({
          mac: e.mac,
          ip: e.ip,
          hostname: "",
          active: true,
          connexion: toConnexion(e.iface),
        })),
      };
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
        const wireless = await apiFetch(
          apiClient.GET("/devices/api-proxy/cudy/{routerId}/wireless", {
            params: { path: { routerId: router.name } },
          }),
        );
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
