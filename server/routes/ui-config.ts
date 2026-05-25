import type http from "node:http";
import { loadUiConfig } from "../config.ts";

export function handleUiConfig(_req: http.IncomingMessage, res: http.ServerResponse): void {
  const config = loadUiConfig();
  const payload = JSON.stringify(config);
  res.writeHead(200, { "content-type": "application/json", "content-length": Buffer.byteLength(payload) });
  res.end(payload);
}
