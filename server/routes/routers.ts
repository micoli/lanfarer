import type http from "node:http";
import { loadAllRouters } from "../config.ts";

export function handleRouters(_req: http.IncomingMessage, res: http.ServerResponse): void {
  const routers = loadAllRouters();
  const body = JSON.stringify(routers);
  res.writeHead(200, { "content-type": "application/json", "content-length": Buffer.byteLength(body) });
  res.end(body);
}
