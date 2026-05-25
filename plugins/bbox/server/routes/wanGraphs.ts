import type http from "node:http";
import type { BboxRouterSpec } from "../../../../server/config.ts";
import type { WanGraphPoint, WanGraphsData } from "../../../contracts.ts";
import { bboxCall } from "../client.ts";
import { sendJson, sendError } from "../utils.ts";

// Bbox graph response: { type, rate, data: [[interval_sec, bytes], ...], last }
// data entries go from oldest to newest; last is an internal relative timestamp.
// We anchor the final sample to Date.now() and walk backwards.
const MAX_INTERVAL_SEC = 3600; // discard catch-all buckets older than 1 hour

function extractPoints(raw: unknown): WanGraphPoint[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  const obj = raw as { data?: [number, number][] };
  if (!Array.isArray(obj.data)) return [];

  const nowSec = Math.floor(Date.now() / 1000);
  const points: WanGraphPoint[] = [];
  let cursor = nowSec;

  for (let i = obj.data.length - 1; i >= 0; i--) {
    const [interval, kbps] = obj.data[i];
    if (interval <= 0 || interval > MAX_INTERVAL_SEC) {
      cursor -= interval > 0 ? interval : 0;
      continue;
    }
    const ts = cursor - Math.floor(interval / 2);
    points.unshift({ ts, value: kbps });
    cursor -= interval;
  }

  return points;
}

export async function handleWanGraphs(
  _req: http.IncomingMessage,
  res: http.ServerResponse,
  spec: BboxRouterSpec,
): Promise<void> {
  const [downResult, upResult] = await Promise.all([
    bboxCall(spec, "GET", "/api/v1/graphs/wan/downstream/hour"),
    bboxCall(spec, "GET", "/api/v1/graphs/wan/upstream/hour"),
  ]);

  if (downResult.statusCode !== 200 || upResult.statusCode !== 200) {
    sendError(res, 502, "Failed to fetch WAN graphs from bbox");
    return;
  }

  const data: WanGraphsData = {
    down: extractPoints(downResult.data),
    up: extractPoints(upResult.data),
  };

  sendJson(res, 200, data);
}
