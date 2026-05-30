import { apiClient, apiFetch } from "../../../../src/lib/api/client.ts";
import type { components } from "../../../../src/lib/api/schema.d.ts";

type DhcpClient = components["schemas"]["DhcpClient"];
type DhcpClientWrite = components["schemas"]["DhcpClientWrite"];
type DhcpConfigUpdate = components["schemas"]["DhcpConfigUpdate"];

export const bboxApi = {
  getDevice(routerId: string) {
    return apiFetch(
      apiClient.GET("/devices/api-proxy/bbox/{routerId}/device", { params: { path: { routerId } } }),
    );
  },

  getWanStats(routerId: string) {
    return apiFetch(
      apiClient.GET("/devices/api-proxy/bbox/{routerId}/wan/stats", { params: { path: { routerId } } }),
    );
  },

  getWanGraphs(routerId: string) {
    return apiFetch(
      apiClient.GET("/devices/api-proxy/bbox/{routerId}/wan/graphs", { params: { path: { routerId } } }),
    );
  },

  getWireless(routerId: string) {
    return apiFetch(
      apiClient.GET("/devices/api-proxy/bbox/{routerId}/wireless", { params: { path: { routerId } } }),
    );
  },

  getWifiSettings(routerId: string) {
    return apiFetch(
      apiClient.GET("/devices/api-proxy/bbox/{routerId}/wifi-settings", { params: { path: { routerId } } }),
    );
  },

  getDhcpConfig(routerId: string) {
    return apiFetch(
      apiClient.GET("/devices/api-proxy/bbox/{routerId}/dhcp/config", { params: { path: { routerId } } }),
    );
  },

  updateDhcpConfig(routerId: string, config: DhcpConfigUpdate): Promise<void> {
    return apiFetch(
      apiClient.PUT("/devices/api-proxy/bbox/{routerId}/dhcp/config", {
        params: { path: { routerId } },
        body: config,
      }),
    ) as Promise<void>;
  },

  getHosts(routerId: string) {
    return apiFetch(
      apiClient.GET("/devices/api-proxy/bbox/{routerId}/hosts", { params: { path: { routerId } } }),
    );
  },

  getDhcpOptions(routerId: string) {
    return apiFetch(
      apiClient.GET("/devices/api-proxy/bbox/{routerId}/dhcp/options", { params: { path: { routerId } } }),
    );
  },

  createDhcpOption(routerId: string, option: number, value: string): Promise<void> {
    return apiFetch(
      apiClient.POST("/devices/api-proxy/bbox/{routerId}/dhcp/options", {
        params: { path: { routerId } },
        body: { option, value },
      }),
    ) as Promise<void>;
  },

  updateDhcpOption(routerId: string, id: number, option: number, value: string): Promise<void> {
    return apiFetch(
      apiClient.PUT("/devices/api-proxy/bbox/{routerId}/dhcp/options/{id}", {
        params: { path: { routerId, id } },
        body: { option, value },
      }),
    ) as Promise<void>;
  },

  deleteDhcpOption(routerId: string, id: number): Promise<void> {
    return apiFetch(
      apiClient.DELETE("/devices/api-proxy/bbox/{routerId}/dhcp/options/{id}", {
        params: { path: { routerId, id } },
      }),
    ) as Promise<void>;
  },

  getDhcpClients(routerId: string) {
    return apiFetch(
      apiClient.GET("/devices/api-proxy/bbox/{routerId}/dhcp/clients", { params: { path: { routerId } } }),
    );
  },

  createDhcpClient(routerId: string, client: Omit<DhcpClient, "id">): Promise<void> {
    const body: DhcpClientWrite = {
      enable: client.enable,
      macaddress: client.macaddress,
      ipaddress: client.ipaddress,
      ip6address: client.ip6address,
      hostname: client.hostname,
    };
    return apiFetch(
      apiClient.POST("/devices/api-proxy/bbox/{routerId}/dhcp/clients", {
        params: { path: { routerId } },
        body,
      }),
    ) as Promise<void>;
  },

  updateDhcpClient(routerId: string, id: number, client: Partial<Omit<DhcpClient, "id">>): Promise<void> {
    const body: DhcpClientWrite = {
      enable: client.enable ?? 1,
      macaddress: client.macaddress ?? "",
      ipaddress: client.ipaddress ?? "",
      ip6address: client.ip6address ?? "",
      hostname: client.hostname ?? "",
    };
    return apiFetch(
      apiClient.PUT("/devices/api-proxy/bbox/{routerId}/dhcp/clients/{id}", {
        params: { path: { routerId, id } },
        body,
      }),
    ) as Promise<void>;
  },

  deleteDhcpClient(routerId: string, id: number): Promise<void> {
    return apiFetch(
      apiClient.DELETE("/devices/api-proxy/bbox/{routerId}/dhcp/clients/{id}", {
        params: { path: { routerId, id } },
      }),
    ) as Promise<void>;
  },
};
