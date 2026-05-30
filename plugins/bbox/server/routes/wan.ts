import type http from "node:http";
import type { BboxRouterSpec } from "../../../../server/config.ts";
import type { WanStatsData } from "../../../contracts.ts";
import { bboxCall } from "../client.ts";
import { sendJson, sendError } from "../utils.ts";

export async function fetchBboxWan(spec: BboxRouterSpec): Promise<WanStatsData> {
  const result = await bboxCall(spec, "GET", "/api/v1/wan/ip/stats");
  if (result.statusCode !== 200) throw new Error(`bbox wan/stats returned ${result.statusCode}`);
  const arr = result.data as Array<{ wan?: { ip?: { stats?: Record<string, unknown> } } }>;
  const s = arr?.[0]?.wan?.ip?.stats ?? {};

  function side(k: string): { bytes: number; bandwidth: number; contractualBandwidth: number; occupation: number } {
    const d = s[k] as Record<string, unknown> | undefined ?? {};
    return {
      bytes: Number(d.bytes ?? 0),
      bandwidth: Number(d.bandwidth ?? 0),
      contractualBandwidth: Number(d.contractualBandwidth ?? 0),
      occupation: Number(d.occupation ?? 0),
    };
  }

  return { rx: side("rx"), tx: side("tx") };
}

export async function handleWan(
  _req: http.IncomingMessage,
  res: http.ServerResponse,
  spec: BboxRouterSpec,
): Promise<void> {
  try {
    sendJson(res, 200, await fetchBboxWan(spec));
  } catch {
    sendError(res, 502, "Failed to fetch WAN stats from bbox");
  }
}
