import { basePath } from "../../../../src/lib/basePath.ts";
import { BboxApiError } from "../../../../src/lib/api/client.ts";
import type {
  DeviceData,
  DhcpClient,
  DhcpClientsData,
  DhcpConfigData,
  DhcpOptionsData,
  HostsData,
  WanGraphsData,
  WanStatsData,
  WirelessData,
} from "../../../contracts.ts";

// DhcpConfigUpdate is not in contracts.ts — define it inline
type DhcpConfigUpdateBody = {
  enable?: number;
  minaddress?: string;
  maxaddress?: string;
  leasetime?: number;
};

async function bboxFetch<T>(
  routerId: string,
  method: string,
  resource: string,
  body?: Record<string, unknown>
): Promise<T> {
  const url = `${basePath()}/devices/api-proxy/bbox/${routerId}${resource}`;
  const init: RequestInit = { method };
  if (body !== undefined) {
    init.headers = { "content-type": "application/json" };
    init.body = JSON.stringify(body);
  }
  const res = await fetch(url, init);
  if (!res.ok) throw new BboxApiError(res.status, `Erreur API ${res.status}`);
  if (res.status === 204 || res.headers.get("content-length") === "0") return undefined as T;
  return res.json() as Promise<T>;
}

export const bboxApi = {
  getDevice(routerId: string): Promise<DeviceData> {
    return bboxFetch<DeviceData>(routerId, "GET", "/device");
  },

  getWanStats(routerId: string): Promise<WanStatsData> {
    return bboxFetch<WanStatsData>(routerId, "GET", "/wan/stats");
  },

  getWanGraphs(routerId: string): Promise<WanGraphsData> {
    return bboxFetch<WanGraphsData>(routerId, "GET", "/wan/graphs");
  },

  getWireless(routerId: string): Promise<WirelessData> {
    return bboxFetch<WirelessData>(routerId, "GET", "/wireless");
  },

  getWifiSettings(routerId: string): Promise<unknown> {
    return bboxFetch<unknown>(routerId, "GET", "/wifi-settings");
  },

  getDhcpConfig(routerId: string): Promise<DhcpConfigData> {
    return bboxFetch<DhcpConfigData>(routerId, "GET", "/dhcp/config");
  },

  updateDhcpConfig(routerId: string, config: DhcpConfigUpdateBody): Promise<void> {
    return bboxFetch<void>(routerId, "PUT", "/dhcp/config", config as Record<string, unknown>);
  },

  getHosts(routerId: string): Promise<HostsData> {
    return bboxFetch<HostsData>(routerId, "GET", "/hosts");
  },

  getDhcpOptions(routerId: string): Promise<DhcpOptionsData> {
    return bboxFetch<DhcpOptionsData>(routerId, "GET", "/dhcp/options");
  },

  createDhcpOption(routerId: string, option: number, value: string): Promise<void> {
    return bboxFetch<void>(routerId, "POST", "/dhcp/options", { option, value });
  },

  updateDhcpOption(routerId: string, id: number, option: number, value: string): Promise<void> {
    return bboxFetch<void>(routerId, "PUT", `/dhcp/options/${id}`, { option, value });
  },

  deleteDhcpOption(routerId: string, id: number): Promise<void> {
    return bboxFetch<void>(routerId, "DELETE", `/dhcp/options/${id}`);
  },

  getDhcpClients(routerId: string): Promise<DhcpClientsData> {
    return bboxFetch<DhcpClientsData>(routerId, "GET", "/dhcp/clients");
  },

  createDhcpClient(routerId: string, client: Omit<DhcpClient, "id">): Promise<void> {
    return bboxFetch<void>(routerId, "POST", "/dhcp/clients", {
      enable: client.enable,
      macaddress: client.macaddress,
      ipaddress: client.ipaddress,
      ip6address: client.ip6address,
      hostname: client.hostname,
    });
  },

  updateDhcpClient(routerId: string, id: number, client: Partial<Omit<DhcpClient, "id">>): Promise<void> {
    return bboxFetch<void>(routerId, "PUT", `/dhcp/clients/${id}`, {
      enable: client.enable ?? 1,
      macaddress: client.macaddress ?? "",
      ipaddress: client.ipaddress ?? "",
      ip6address: client.ip6address ?? "",
      hostname: client.hostname ?? "",
    });
  },

  deleteDhcpClient(routerId: string, id: number): Promise<void> {
    return bboxFetch<void>(routerId, "DELETE", `/dhcp/clients/${id}`);
  },
};
