import { apiClient, apiFetch } from "./client.ts";
import type { components } from "./schema.d.ts";

export type HealthResponse = components["schemas"]["HealthResponse"];
export type CheckIpResponse = components["schemas"]["CheckIpResponse"];
export type ScanHost = components["schemas"]["ScanHost"];
export type HostDetail = components["schemas"]["HostDetail"];

export const serverApi = {
  health(): Promise<HealthResponse> {
    return apiFetch(apiClient.GET("/__health"));
  },

  checkIp(ip: string): Promise<CheckIpResponse> {
    return apiFetch(apiClient.GET("/__check-ip", { params: { query: { ip } } }));
  },
};
