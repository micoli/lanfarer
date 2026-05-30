import type http from "node:http";
import type { BboxRouterSpec } from "../../../../server/config.ts";
import type { DeviceData } from "../../../contracts.ts";
import { bboxCall } from "../client.ts";
import { sendJson, sendError } from "../utils.ts";

export async function fetchBboxDevice(spec: BboxRouterSpec): Promise<DeviceData> {
  const result = await bboxCall(spec, "GET", "/api/v1/device");
  if (result.statusCode !== 200) throw new Error(`bbox device returned ${result.statusCode}`);
  const arr = result.data as Array<{ device?: Record<string, unknown> }>;
  const d = arr?.[0]?.device ?? {};
  const running = d.running as Record<string, string> | undefined;
  const using = d.using as Record<string, number> | undefined;
  return {
    modelname: String(d.modelname ?? ""),
    serialnumber: String(d.serialnumber ?? ""),
    firmware: String(running?.version ?? ""),
    firmwareDate: String(running?.date ?? ""),
    uptime: Number(d.uptime ?? 0),
    boots: Number(d.numberofboots ?? 0),
    using: {
      ipv4: Boolean(using?.ipv4),
      ipv6: Boolean(using?.ipv6),
      ftth: Boolean(using?.ftth),
    },
  };
}

export async function handleDevice(
  _req: http.IncomingMessage,
  res: http.ServerResponse,
  spec: BboxRouterSpec,
): Promise<void> {
  try {
    sendJson(res, 200, await fetchBboxDevice(spec));
  } catch {
    sendError(res, 502, "Failed to fetch device info from bbox");
  }
}
