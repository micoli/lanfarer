import { useQueries, useQuery } from "@tanstack/react-query";
import { basePath } from "../../../../src/lib/basePath.ts";
import type { Host, HostConnexion, HostsData } from "../../../contracts.ts";

export interface KuwfiClient {
  mac: string;
  ip: string;
  signal_dbm: number;
  band: "2.4G" | "5G";
  ssid: string;
}

export interface KuwfiAccessPoint {
  ssid: string;
  band: "2.4G" | "5G";
  channel: number;
  clients: KuwfiClient[];
}

export interface KuwfiRouterData {
  name: string;
  ip: string;
  online: boolean;
  firmware: string;
  uptime: number;
  accessPoints: KuwfiAccessPoint[];
}

function usekuwfiRouterList() {
  return useQuery({
    queryKey: ["kuwfi", "list"],
    queryFn: async () => {
      const res = await fetch(`${basePath()}/devices/api-proxy/kuwfi-proxy/status`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<{ routers: { name: string; ip: string }[] }>;
    },
    staleTime: 60_000,
  });
}

export function useKuwfiHosts(routerId: string | null) {
  return useQuery<HostsData>({
    queryKey: ["kuwfi", "hosts", routerId],
    queryFn: async () => {
      const res = await fetch(`${basePath()}/devices/api-proxy/kuwfi-proxy/${routerId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as KuwfiRouterData;
      const toConnexion = (band: "2.4G" | "5G"): HostConnexion =>
        band === "5G" ? "wifi 5G" : "wifi 2.4G";
      const hosts: Host[] = data.accessPoints.flatMap((ap) =>
        ap.clients.map((c) => ({
          mac: c.mac,
          ip: c.ip,
          hostname: "",
          active: true,
          connexion: toConnexion(c.band),
          ssid: c.ssid,
        })),
      );
      return { hosts };
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
      queryFn: async (): Promise<KuwfiRouterData> => {
        const res = await fetch(`${basePath()}/devices/api-proxy/kuwfi-proxy/${router.name}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<KuwfiRouterData>;
      },
      refetchInterval: 30_000,
    })),
    combine: (results) => ({
      data: results.map((r) => r.data).filter(Boolean) as KuwfiRouterData[],
      isLoading: results.some((r) => r.isLoading),
      error: results.find((r) => r.error)?.error ?? null,
    }),
  });
}
