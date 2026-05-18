import { bboxDelete, bboxFetch, bboxPost, bboxPut } from "./client";
import type { DhcpClient, DhcpResponse } from "./types";

// Paths are relative to /bbox-api/ which nginx proxies to the router.
// Adjust these if the BBox firmware version uses different paths.

export const bboxApi = {
  async getDevice(): Promise<unknown> {
    return bboxFetch<unknown>("api/v1/device");
  },

  async getWanStats(): Promise<unknown> {
    return bboxFetch<unknown>("api/v1/wan/ip/stats");
  },

  async getWireless(): Promise<unknown> {
    return bboxFetch<unknown>("api/v1/wireless");
  },

  // DHCP configuration (lease time, pool, DNS)
  async getDhcp(): Promise<DhcpResponse> {
    const data = await bboxFetch<DhcpResponse[]>("api/v1/dhcp");
    return data[0];
  },

  async updateDhcp(config: {
    enable?: number;
    minaddress?: string;
    maxaddress?: string;
    leasetime?: number;
  }): Promise<void> {
    return bboxPut("api/v1/dhcp", config as Record<string, string | number>);
  },

  async getHosts(): Promise<unknown> {
    return bboxFetch<unknown>("api/v1/hosts");
  },

  async getDhcpOptions(): Promise<unknown> {
    return bboxFetch<unknown>("api/v1/dhcp/options");
  },

  async createDhcpOption(option: number, value: string): Promise<void> {
    return bboxPost("api/v1/dhcp/option", { option, value });
  },

  async updateDhcpOption(id: number, option: number, value: string): Promise<void> {
    return bboxPut(`api/v1/dhcp/options/${id}`, { enable: 1, name: option, format: "", value });
  },

  async deleteDhcpOption(id: number): Promise<void> {
    return bboxDelete(`api/v1/dhcp/options/${id}`);
  },

  // Static DHCP reservations
  async getDhcpClients(): Promise<DhcpClient[]> {
    return bboxFetch<DhcpClient[]>("api/v1/dhcp/clients");
  },

  async createDhcpClient(client: Omit<DhcpClient, "id">): Promise<void> {
    const {
      hostname = "",
      macaddress = "",
      ipaddress = "",
      ip6address = "",
      enable = 1,
    } = client as DhcpClient;
    return bboxPost("api/v1/dhcp/clients", {
      enable,
      device: macaddress,
      ipaddress,
      ip6address,
      macaddress,
      hostname,
    });
  },

  async updateDhcpClient(id: number, client: Partial<Omit<DhcpClient, "id">>): Promise<void> {
    const {
      hostname = "",
      macaddress = "",
      ipaddress = "",
      ip6address = "",
      enable = 1,
    } = client as DhcpClient;
    return bboxPut(`api/v1/dhcp/clients/${id}`, {
      enable,
      device: macaddress,
      ipaddress,
      ip6address,
      macaddress,
      hostname,
    });
  },

  async deleteDhcpClient(id: number): Promise<void> {
    return bboxDelete(`api/v1/dhcp/clients/${id}`);
  },
};
