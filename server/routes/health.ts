import http from "node:http";
import { BBOX_TARGET } from "../config.ts";
import { getSession } from "../session.ts";

export function handleHealth(_req: http.IncomingMessage, res: http.ServerResponse): void {
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify({ ok: true, hasSession: getSession() !== null, target: BBOX_TARGET }));
}
