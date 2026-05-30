import type http from "node:http";
import type { WirelessData } from "../../contracts.ts";
import { fetchCudyBandwidth, fetchCudyDevlist, fetchCudyRouter, loadCudyConfig } from "./fetcher.ts";

function sendJson(res: http.ServerResponse, statusCode: number, data: unknown): void {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(body),
  });
  res.end(body);
}

export async function handleCudy(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const url = req.url ?? "/";

  // Status endpoint: list configured routers
  if (url === "/devices/api-proxy/cudy/status" && req.method === "GET") {
    const configs = loadCudyConfig();
    sendJson(res, 200, {
      configured: configs.length,
      routers: configs.map((r) => ({ name: r.name, ip: r.ip })),
    });
    return;
  }

  // Per-router endpoints
  if (url.startsWith("/devices/api-proxy/cudy/") && req.method === "GET") {
    const afterPrefix = url.slice("/devices/api-proxy/cudy/".length);
    const parts = afterPrefix.split("/");
    const routerId = parts[0];
    const subpath = parts[1] ?? "wireless";

    if (routerId === "status") {
      sendJson(res, 404, { error: "not found" });
      return;
    }

    const cfg = loadCudyConfig().find((r) => r.name === routerId);
    if (!cfg) {
      sendJson(res, 404, { error: `Router '${routerId}' not found` });
      return;
    }

    try {
      if (subpath === "bandwidth") {
        const data = await fetchCudyBandwidth(cfg);
        sendJson(res, 200, data);
        return;
      }

      if (subpath === "devlist") {
        const data = await fetchCudyDevlist(cfg);
        sendJson(res, data === null ? 502 : 200, data ?? { error: "login failed or endpoint unavailable" });
        return;
      }

      // default: wireless
      const result = await fetchCudyRouter(cfg);
      const wireless: WirelessData = {
        online: result.online,
        accessPoints: result.interfaces.map((iface) => ({
          ssid: iface.ssid,
          band: iface.band,
          channel: iface.channel,
          bssid: iface.bssid,
          password: iface.password,
          standard: iface.standard,
          width: iface.width,
          clients: iface.clients.map((c) => ({
            mac: c.mac,
            signal_dbm: c.signal_dbm,
            tx_kbps: c.tx_rate,
            rx_kbps: c.rx_rate,
            inactive_ms: c.inactive_ms,
          })),
        })),
      };
      sendJson(res, 200, wireless);
    } catch (err) {
      sendJson(res, 500, { error: (err as Error).message });
    }
    return;
  }

  sendJson(res, 404, { error: "not found" });
}
