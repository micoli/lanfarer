import type http from "node:http";
import type { BboxRouterSpec } from "../../../../server/config.ts";
import { bboxCall } from "../client.ts";
import { sendJson, sendError } from "../utils.ts";

export async function handleWifiSettings(
  _req: http.IncomingMessage,
  res: http.ServerResponse,
  spec: BboxRouterSpec,
): Promise<void> {
  const result = await bboxCall(spec, "GET", "/api/v1/wireless");
  if (result.statusCode !== 200) {
    sendError(res, 502, "Failed to fetch wifi settings from bbox");
    return;
  }
  sendJson(res, 200, result.data);
}
