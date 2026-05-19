import { apiClient, apiFetch } from "./client.ts";
import type { components } from "./schema.d.ts";

type DhcpClient = components["schemas"]["DhcpClient"];

export const bboxApi = {
  getDevice(): Promise<unknown> {
    return apiFetch(apiClient.GET("/bbox-api/api/v1/device"));
  },

  getWanStats(): Promise<unknown> {
    return apiFetch(apiClient.GET("/bbox-api/api/v1/wan/ip/stats"));
  },

  getWireless(): Promise<unknown> {
    return apiFetch(apiClient.GET("/bbox-api/api/v1/wireless"));
  },

  async getDhcp(): Promise<components["schemas"]["DhcpResponse"]> {
    const data = await apiFetch(apiClient.GET("/bbox-api/api/v1/dhcp"));
    return (data as components["schemas"]["DhcpResponse"][])[0];
  },

  updateDhcp(config: components["schemas"]["DhcpConfigUpdate"]): Promise<unknown> {
    return apiFetch(apiClient.PUT("/bbox-api/api/v1/dhcp", { body: config }));
  },

  getHosts(): Promise<unknown> {
    return apiFetch(apiClient.GET("/bbox-api/api/v1/hosts"));
  },

  getDhcpOptions(): Promise<unknown> {
    return apiFetch(apiClient.GET("/bbox-api/api/v1/dhcp/options"));
  },

  createDhcpOption(option: number, value: string): Promise<unknown> {
    return apiFetch(apiClient.POST("/bbox-api/api/v1/dhcp/option", { body: { option, value } }));
  },

  updateDhcpOption(id: number, option: number, value: string): Promise<unknown> {
    return apiFetch(
      apiClient.PUT("/bbox-api/api/v1/dhcp/options/{id}", {
        params: { path: { id } },
        body: { enable: 1, name: option, format: "", value },
      })
    );
  },

  deleteDhcpOption(id: number): Promise<unknown> {
    return apiFetch(
      apiClient.DELETE("/bbox-api/api/v1/dhcp/options/{id}", {
        params: { path: { id } },
      })
    );
  },

  getDhcpClients(): Promise<DhcpClient[]> {
    return apiFetch(apiClient.GET("/bbox-api/api/v1/dhcp/clients")) as Promise<DhcpClient[]>;
  },

  createDhcpClient(client: Omit<DhcpClient, "id">): Promise<unknown> {
    return apiFetch(
      apiClient.POST("/bbox-api/api/v1/dhcp/clients", {
        body: {
          enable: client.enable,
          device: client.macaddress,
          ipaddress: client.ipaddress,
          ip6address: client.ip6address,
          macaddress: client.macaddress,
          hostname: client.hostname,
        },
      })
    );
  },

  updateDhcpClient(id: number, client: Partial<Omit<DhcpClient, "id">>): Promise<unknown> {
    return apiFetch(
      apiClient.PUT("/bbox-api/api/v1/dhcp/clients/{id}", {
        params: { path: { id } },
        body: {
          enable: client.enable ?? 1,
          device: client.macaddress ?? "",
          ipaddress: client.ipaddress ?? "",
          ip6address: client.ip6address ?? "",
          macaddress: client.macaddress ?? "",
          hostname: client.hostname ?? "",
        },
      })
    );
  },

  deleteDhcpClient(id: number): Promise<unknown> {
    return apiFetch(
      apiClient.DELETE("/bbox-api/api/v1/dhcp/clients/{id}", {
        params: { path: { id } },
      })
    );
  },
};
