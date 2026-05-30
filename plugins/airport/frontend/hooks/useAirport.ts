import { useQuery } from "@tanstack/react-query";
import { apiClient, apiFetch } from "../../../../src/lib/api/client.ts";
import type { components } from "../../../../src/lib/api/schema.d.ts";
import type { HostsData } from "../../../contracts.ts";

type AirportRouterDetail = components["schemas"]["AirportRouterDetail"];
type AirportWirelessData = components["schemas"]["AirportWirelessData"];
type AirportWifiSettings = components["schemas"]["AirportWifiSettings"];
type AirportDeviceInfo = components["schemas"]["AirportDeviceInfo"];

export type { AirportWifiSettings };
export type AirportWifiInterface = components["schemas"]["AirportWifiInterface"];
export type AirportWifiClient = components["schemas"]["AirportWifiClient"];
export type AirportAccessPoint = components["schemas"]["AirportAccessPoint"];
export type { AirportWirelessData };

export interface AirportHostsData extends HostsData {
  online: boolean;
}

export function useAirportDeviceInfo(routerId: string | null) {
  return useQuery<AirportDeviceInfo>({
    queryKey: ["airport", "device-info", routerId],
    queryFn: () =>
      apiFetch(
        apiClient.GET("/devices/api-proxy/airport/{routerId}/device-info", {
          params: { path: { routerId: routerId! } },
        }),
      ),
    staleTime: 300_000,
    enabled: routerId !== null,
  });
}

export function useAirportWifiSettings(routerId: string | null) {
  return useQuery<AirportWifiSettings>({
    queryKey: ["airport", "wifi-settings", routerId],
    queryFn: () =>
      apiFetch(
        apiClient.GET("/devices/api-proxy/airport/{routerId}/wifi-settings", {
          params: { path: { routerId: routerId! } },
        }),
      ),
    staleTime: 60_000,
    enabled: routerId !== null,
  });
}

export function useAirportWireless(routerId: string | null) {
  return useQuery<AirportWirelessData>({
    queryKey: ["airport", "wireless", routerId],
    queryFn: () =>
      apiFetch(
        apiClient.GET("/devices/api-proxy/airport/{routerId}/wireless", {
          params: { path: { routerId: routerId! } },
        }),
      ),
    refetchInterval: 30_000,
    enabled: routerId !== null,
  });
}

export function useAirportHosts(routerId: string | null) {
  return useQuery<AirportHostsData>({
    queryKey: ["airport", "hosts", routerId],
    queryFn: async () => {
      const body = await apiFetch(
        apiClient.GET("/devices/api-proxy/airport/{routerId}/hosts", {
          params: { path: { routerId: routerId! } },
        }),
      ) as AirportRouterDetail;
      const hosts = body.hosts.map((e) => ({
        mac: e.mac,
        ip: e.ip,
        hostname: e.hostname,
        active: true,
        connexion: e.wireless ? ("wifi 2.4G" as const) : ("wired" as const),
      }));
      return { online: body.online, hosts };
    },
    refetchInterval: 30_000,
    enabled: routerId !== null,
  });
}
