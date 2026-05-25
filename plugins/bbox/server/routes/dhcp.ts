import type http from "node:http";
import type { BboxRouterSpec } from "../../../../server/config.ts";
import type {
  DhcpClient,
  DhcpClientsData,
  DhcpConfig,
  DhcpConfigData,
  DhcpOption,
  DhcpOptionCapability,
  DhcpOptionsData,
} from "../../../contracts.ts";
import { bboxCall } from "../client.ts";
import { readJsonBody, sendJson, sendError, sendStatus } from "../utils.ts";

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractClients(data: unknown): DhcpClient[] {
  if (!Array.isArray(data)) return [];
  if (data.length === 0) return [];
  const first = data[0] as Record<string, unknown>;
  let raw: unknown[] = [];
  if ("macaddress" in first) {
    raw = data;
  } else if (Array.isArray((first.dhcp as Record<string, unknown> | undefined)?.clients ?? null)) {
    raw = ((first.dhcp as Record<string, unknown>).clients) as unknown[];
  } else if (Array.isArray((first as Record<string, unknown>).dhcpclients)) {
    raw = (first as Record<string, unknown>).dhcpclients as unknown[];
  }
  return (raw as Record<string, unknown>[]).map((c) => ({
    id: Number(c.id ?? 0),
    enable: Number(c.enable ?? 1),
    hostname: String(c.hostname ?? ""),
    macaddress: String(c.macaddress ?? ""),
    ipaddress: String(c.ipaddress ?? ""),
    ip6address: String(c.ip6address ?? ""),
  }));
}

function extractConfig(data: unknown): DhcpConfig {
  const arr = data as Array<{ dhcp?: Record<string, unknown> }>;
  const dhcp = arr?.[0]?.dhcp ?? {};
  return {
    enable: Number(dhcp.enable ?? 0),
    minaddress: String(dhcp.minaddress ?? ""),
    maxaddress: String(dhcp.maxaddress ?? ""),
    leasetime: Number(dhcp.leasetime ?? 0),
  };
}

function extractOptions(data: unknown): DhcpOptionsData {
  const arr = data as Array<{ dhcp?: Record<string, unknown> }>;
  const dhcp = arr?.[0]?.dhcp ?? {};
  const options = (dhcp.options as DhcpOption[] | undefined) ?? [];
  const optionsstatic = (dhcp.optionsstatic as DhcpOption[] | undefined) ?? [];
  const caps = (dhcp.optionscapabilities as DhcpOptionCapability[] | undefined) ?? [];
  return {
    options,
    optionsstatic,
    capabilities: caps.map((c) => ({ id: c.id, type: c.type, description: c.description })),
  };
}

// ── Handlers ──────────────────────────────────────────────────────────────────

export async function handleDhcp(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  spec: BboxRouterSpec,
  subpath: string,
): Promise<void> {
  const method = req.method ?? "GET";

  // /dhcp/config
  if (subpath === "/dhcp/config") {
    if (method === "GET") {
      const r = await bboxCall(spec, "GET", "/api/v1/dhcp");
      if (r.statusCode !== 200) { sendError(res, 502, "DHCP config fetch failed"); return; }
      const result: DhcpConfigData = { config: extractConfig(r.data) };
      sendJson(res, 200, result);
      return;
    }
    if (method === "PUT") {
      const body = await readJsonBody(req);
      const r = await bboxCall(spec, "PUT", "/api/v1/dhcp", body);
      sendStatus(res, r.statusCode < 300 ? 204 : r.statusCode);
      return;
    }
  }

  // /dhcp/clients
  if (subpath === "/dhcp/clients") {
    if (method === "GET") {
      const r = await bboxCall(spec, "GET", "/api/v1/dhcp/clients");
      if (r.statusCode !== 200) { sendError(res, 502, "DHCP clients fetch failed"); return; }
      const result: DhcpClientsData = { clients: extractClients(r.data) };
      sendJson(res, 200, result);
      return;
    }
    if (method === "POST") {
      const body = await readJsonBody(req);
      // BBox requires `device` as alias for macaddress on create
      const bboxBody = {
        enable: body.enable ?? 1,
        device: body.macaddress ?? "",
        ipaddress: body.ipaddress ?? "",
        ip6address: body.ip6address ?? "",
        macaddress: body.macaddress ?? "",
        hostname: body.hostname ?? "",
      };
      const r = await bboxCall(spec, "POST", "/api/v1/dhcp/clients", bboxBody);
      sendStatus(res, r.statusCode < 300 ? 204 : r.statusCode);
      return;
    }
  }

  // /dhcp/clients/{id}
  const clientMatch = subpath.match(/^\/dhcp\/clients\/(\d+)$/);
  if (clientMatch) {
    const id = clientMatch[1];
    if (method === "PUT") {
      const body = await readJsonBody(req);
      const bboxBody = {
        enable: body.enable ?? 1,
        device: body.macaddress ?? "",
        ipaddress: body.ipaddress ?? "",
        ip6address: body.ip6address ?? "",
        macaddress: body.macaddress ?? "",
        hostname: body.hostname ?? "",
      };
      const r = await bboxCall(spec, "PUT", `/api/v1/dhcp/clients/${id}`, bboxBody);
      sendStatus(res, r.statusCode < 300 ? 204 : r.statusCode);
      return;
    }
    if (method === "DELETE") {
      const r = await bboxCall(spec, "DELETE", `/api/v1/dhcp/clients/${id}`);
      sendStatus(res, r.statusCode < 300 ? 204 : r.statusCode);
      return;
    }
  }

  // /dhcp/options
  if (subpath === "/dhcp/options") {
    if (method === "GET") {
      const r = await bboxCall(spec, "GET", "/api/v1/dhcp/options");
      if (r.statusCode !== 200) { sendError(res, 502, "DHCP options fetch failed"); return; }
      sendJson(res, 200, extractOptions(r.data));
      return;
    }
    if (method === "POST") {
      const body = await readJsonBody(req);
      // BBox uses singular /dhcp/option for create
      const r = await bboxCall(spec, "POST", "/api/v1/dhcp/option", {
        option: body.option ?? 0,
        value: body.value ?? "",
      });
      sendStatus(res, r.statusCode < 300 ? 204 : r.statusCode);
      return;
    }
  }

  // /dhcp/options/{id}
  const optMatch = subpath.match(/^\/dhcp\/options\/(\d+)$/);
  if (optMatch) {
    const id = optMatch[1];
    if (method === "PUT") {
      const body = await readJsonBody(req);
      const r = await bboxCall(spec, "PUT", `/api/v1/dhcp/options/${id}`, {
        enable: 1,
        name: body.option ?? 0,
        format: "",
        value: body.value ?? "",
      });
      sendStatus(res, r.statusCode < 300 ? 204 : r.statusCode);
      return;
    }
    if (method === "DELETE") {
      const r = await bboxCall(spec, "DELETE", `/api/v1/dhcp/options/${id}`);
      sendStatus(res, r.statusCode < 300 ? 204 : r.statusCode);
      return;
    }
  }

  sendError(res, 404, `Unknown DHCP route: ${method} ${subpath}`);
}
