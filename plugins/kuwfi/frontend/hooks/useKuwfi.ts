import { useQueries, useQuery } from "@tanstack/react-query";
import { apiClient, apiFetch } from "../../../../src/lib/api/client.ts";
import type { components } from "../../../../src/lib/api/schema.d.ts";
import type { HostConnexion } from "../../../contracts.ts";

type KuwfiBandwidthData = components["schemas"]["KuwfiBandwidthData"];
type KuwfiRouterResult = components["schemas"]["KuwfiRouterResult"];

export type { KuwfiRouterResult as KuwfiRouterData };
export type KuwfiClient = components["schemas"]["KuwfiClient"];
export type KuwfiAccessPoint = components["schemas"]["KuwfiAccessPoint"];

function usekuwfiRouterList() {
  return useQuery({
    queryKey: ["kuwfi", "list"],
    queryFn: () => apiFetch(apiClient.GET("/devices/api-proxy/kuwfi/status")),
    staleTime: 60_000,
  });
}

export function useKuwfiBandwidth(routerId: string | null) {
  return useQuery<KuwfiBandwidthData>({
    queryKey: ["kuwfi", "bandwidth", routerId],
    queryFn: () =>
      apiFetch(
        apiClient.GET("/devices/api-proxy/kuwfi/{routerId}/bandwidth", {
          params: { path: { routerId: routerId! } },
        }),
      ),
    refetchInterval: 30_000,
    enabled: routerId !== null,
  });
}

export function useKuwfiHosts(routerId: string | null) {
  return useQuery({
    queryKey: ["kuwfi", "hosts", routerId],
    queryFn: async () => {
      const data = await apiFetch(
        apiClient.GET("/devices/api-proxy/kuwfi/{routerId}", {
          params: { path: { routerId: routerId! } },
        }),
      );
      const toConnexion = (band: "2.4G" | "5G"): HostConnexion =>
        band === "5G" ? "wifi 5G" : "wifi 2.4G";
      return {
        hosts: data.accessPoints.flatMap((ap) =>
          ap.clients.map((c) => ({
            mac: c.mac,
            ip: c.ip,
            hostname: "",
            active: true,
            connexion: toConnexion(c.band),
            ssid: c.ssid,
          })),
        ),
      };
    },
    refetchInterval: 30_000,
    enabled: routerId !== null,
  });
}

export function useKuwfiClients() {
  const { data: list } = usekuwfiRouterList();
  const routers = list?.routers ?? [];

  return useQueries({
    queries: routers.map((router) => ({
      queryKey: ["kuwfi", "router", router.name],
      queryFn: () =>
        apiFetch(
          apiClient.GET("/devices/api-proxy/kuwfi/{routerId}", {
            params: { path: { routerId: router.name } },
          }),
        ),
      refetchInterval: 30_000,
    })),
    combine: (results) => ({
      data: results.map((r) => r.data).filter(Boolean) as KuwfiRouterResult[],
      isLoading: results.some((r) => r.isLoading),
      error: results.find((r) => r.error)?.error ?? null,
    }),
  });
}
