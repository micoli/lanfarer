import type http from "node:http";
import type { BboxRouterSpec } from "../../../../server/config.ts";
import type { Host, HostsData } from "../../../contracts.ts";
import { bboxCall } from "../client.ts";
import { sendJson, sendError } from "../utils.ts";

type RawHost = {
  macaddress?: string;
  ipaddress?: string;
  ip6address?: string;
  hostname?: string;
  active?: number;
  type?: string;
  lastseen?: number;
};

function extractHosts(data: unknown): RawHost[] {
  if (!Array.isArray(data) || data.length === 0) return [];
  const first = data[0] as Record<string, unknown>;
  const h = first?.hosts as Record<string, unknown> | unknown[] | undefined;
  if (h && !Array.isArray(h) && Array.isArray((h as Record<string, unknown>).list)) {
    return (h as Record<string, unknown>).list as RawHost[];
  }
  if (Array.isArray(h)) return h as RawHost[];
  if (typeof first === "object") return data as RawHost[];
  return [];
}

export async function handleHosts(
  _req: http.IncomingMessage,
  res: http.ServerResponse,
  spec: BboxRouterSpec,
): Promise<void> {
  const result = await bboxCall(spec, "GET", "/api/v1/hosts");

  if (result.statusCode !== 200) {
    sendError(res, 502, "Failed to fetch hosts from bbox");
    return;
  }

  const rawHosts = extractHosts(result.data);

  const hosts: Host[] = rawHosts
    .filter((h) => h.macaddress)
    .map((h) => ({
      mac: h.macaddress!,
      ip: h.ipaddress ?? "",
      ip6: h.ip6address || undefined,
      hostname: h.hostname ?? "",
      active: h.active === 1,
      type: h.type || undefined,
      lastseen: h.lastseen,
    }));

  const data: HostsData = { hosts };
  sendJson(res, 200, data);
}
