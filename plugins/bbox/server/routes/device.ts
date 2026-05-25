import type http from "node:http";
import type { BboxRouterSpec } from "../../../../server/config.ts";
import type { DeviceData } from "../../../contracts.ts";
import { bboxCall } from "../client.ts";
import { sendJson, sendError } from "../utils.ts";

export async function handleDevice(
  _req: http.IncomingMessage,
  res: http.ServerResponse,
  spec: BboxRouterSpec,
): Promise<void> {
  const result = await bboxCall(spec, "GET", "/api/v1/device");

  if (result.statusCode !== 200) {
    sendError(res, 502, "Failed to fetch device info from bbox");
    return;
  }

  const arr = result.data as Array<{ device?: Record<string, unknown> }>;
  const d = arr?.[0]?.device ?? {};

  const running = d.running as Record<string, string> | undefined;
  const using = d.using as Record<string, number> | undefined;

  const data: DeviceData = {
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

  sendJson(res, 200, data);
}
