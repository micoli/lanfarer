import type http from "node:http";
import {lookupVendor} from "../mac-vendor.ts";

function ouiPrefix(mac: string): string {
  return mac.toUpperCase().replace(/[^0-9A-F]/g, "").slice(0, 6);
}

function sendJson(res: http.ServerResponse, code: number, data: unknown) {
  const body = JSON.stringify(data);
  res.writeHead(code, { "content-type": "application/json", "content-length": Buffer.byteLength(body) });
  res.end(body);
}

export async function handleOui(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const url = new URL(req.url ?? "/", "http://localhost");
  const mac = url.searchParams.get("mac");
  if (!mac) { sendJson(res, 400, { error: "mac param required" }); return; }
  const oui = ouiPrefix(mac);
  if (oui.length < 6) { sendJson(res, 400, { error: "invalid mac" }); return; }
  const vendor = await lookupVendor(oui);
  sendJson(res, 200, { vendor });
}
