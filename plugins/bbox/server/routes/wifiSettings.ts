import type http from "node:http";
import type { BboxRouterSpec } from "../../../../server/config.ts";
import { bboxCall } from "../client.ts";
import { sendJson, sendError } from "../utils.ts";

export async function fetchBboxWifiSettings(spec: BboxRouterSpec): Promise<unknown> {
  const result = await bboxCall(spec, "GET", "/api/v1/wireless");
  if (result.statusCode !== 200) throw new Error(`bbox wifi-settings returned ${result.statusCode}`);
  return result.data;
}

export async function handleWifiSettings(
  _req: http.IncomingMessage,
  res: http.ServerResponse,
  spec: BboxRouterSpec,
): Promise<void> {
  try {
    sendJson(res, 200, await fetchBboxWifiSettings(spec));
  } catch {
    sendError(res, 502, "Failed to fetch wifi settings from bbox");
  }
}
