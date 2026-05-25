import { basePath } from "../../../../src/lib/basePath.ts";
import { BboxApiError } from "../../../../src/lib/api/client.ts";
import type { components } from "../../../../src/lib/api/schema.d.ts";

type DhcpClient = components["schemas"]["DhcpClient"];

async function bboxFetch(
  routerId: string,
  method: string,
  path: string,
  body?: Record<string, unknown>
): Promise<unknown> {
  const url = `${basePath()}/devices/api-proxy/bbox-proxy/bbox/${routerId}${path}`;
  const init: RequestInit = { method };
  if (body !== undefined) {
    init.headers = { "content-type": "application/json" };
    init.body = JSON.stringify(body);
  }
  const res = await fetch(url, init);
  if (!res.ok) throw new BboxApiError(res.status, `Erreur API ${res.status}`);
  const data: unknown = await res.json();
  const candidate = data as
    | { exception?: { code: unknown } }
    | Array<{ exception?: { code: unknown } }>
    | undefined;
  const code = Array.isArray(candidate)
    ? candidate[0]?.exception?.code
    : candidate?.exception?.code;
  if (code === "401" || code === 401) throw new BboxApiError(401, "Session expirée");
  return data;
}

export const bboxApi = {
  getDevice(routerId: string): Promise<unknown> {
    return bboxFetch(routerId, "GET", "/api/v1/device");
  },

  getWanStats(routerId: string): Promise<unknown> {
    return bboxFetch(routerId, "GET", "/api/v1/wan/ip/stats");
  },

  getWireless(routerId: string): Promise<unknown> {
    return bboxFetch(routerId, "GET", "/api/v1/wireless");
  },

  async getDhcp(routerId: string): Promise<components["schemas"]["DhcpResponse"]> {
    const data = await bboxFetch(routerId, "GET", "/api/v1/dhcp");
    return (data as components["schemas"]["DhcpResponse"][])[0];
  },

  updateDhcp(
    routerId: string,
    config: components["schemas"]["DhcpConfigUpdate"]
  ): Promise<unknown> {
    return bboxFetch(routerId, "PUT", "/api/v1/dhcp", config as Record<string, unknown>);
  },

  getHosts(routerId: string): Promise<unknown> {
    return bboxFetch(routerId, "GET", "/api/v1/hosts");
  },

  getDhcpOptions(routerId: string): Promise<unknown> {
    return bboxFetch(routerId, "GET", "/api/v1/dhcp/options");
  },

  createDhcpOption(routerId: string, option: number, value: string): Promise<unknown> {
    return bboxFetch(routerId, "POST", "/api/v1/dhcp/option", { option, value });
  },

  updateDhcpOption(routerId: string, id: number, option: number, value: string): Promise<unknown> {
    return bboxFetch(routerId, "PUT", `/api/v1/dhcp/options/${id}`, {
      enable: 1,
      name: option,
      format: "",
      value,
    });
  },

  deleteDhcpOption(routerId: string, id: number): Promise<unknown> {
    return bboxFetch(routerId, "DELETE", `/api/v1/dhcp/options/${id}`);
  },

  getDhcpClients(routerId: string): Promise<DhcpClient[]> {
    return bboxFetch(routerId, "GET", "/api/v1/dhcp/clients") as Promise<DhcpClient[]>;
  },

  createDhcpClient(routerId: string, client: Omit<DhcpClient, "id">): Promise<unknown> {
    return bboxFetch(routerId, "POST", "/api/v1/dhcp/clients", {
      enable: client.enable,
      device: client.macaddress,
      ipaddress: client.ipaddress,
      ip6address: client.ip6address,
      macaddress: client.macaddress,
      hostname: client.hostname,
    });
  },

  updateDhcpClient(
    routerId: string,
    id: number,
    client: Partial<Omit<DhcpClient, "id">>
  ): Promise<unknown> {
    return bboxFetch(routerId, "PUT", `/api/v1/dhcp/clients/${id}`, {
      enable: client.enable ?? 1,
      device: client.macaddress ?? "",
      ipaddress: client.ipaddress ?? "",
      ip6address: client.ip6address ?? "",
      macaddress: client.macaddress ?? "",
      hostname: client.hostname ?? "",
    });
  },

  deleteDhcpClient(routerId: string, id: number): Promise<unknown> {
    return bboxFetch(routerId, "DELETE", `/api/v1/dhcp/clients/${id}`);
  },
};
