import type http from "node:http";
import type { RouterPlugin } from "../../../server/plugin.ts";
import type { HostConnexion, MapAccessPoint, MapClient } from "../../contracts.ts";
import { fetchAllKuwfiRouters, fetchKuwfiBandwidth, fetchKuwfiRouter, loadKuwfiConfig } from "./fetcher.ts";

const PREFIX = "/devices/api-proxy/kuwfi-proxy/";

function sendJson(res: http.ServerResponse, status: number, data: unknown): void {
  const body = JSON.stringify(data);
  res.writeHead(status, { "content-type": "application/json", "content-length": Buffer.byteLength(body) });
  res.end(body);
}

export const plugin: RouterPlugin = {
  type: "kuwfi",

  async fetchHosts() {
    const routers = await fetchAllKuwfiRouters();
    const seen = new Set<string>();
    const hosts = routers.flatMap((r) =>
      r.accessPoints.flatMap((ap) =>
        ap.clients.map((c) => ({
          mac: c.mac,
          ip: c.ip,
          hostname: "",
          active: true,
          connexion: ap.band === "5G" ? ("wifi 5G" as HostConnexion) : ("wifi 2.4G" as HostConnexion),
          ssid: ap.ssid,
        })),
      ),
    ).filter((h) => {
      const key = h.mac.toUpperCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return { hosts };
  },

  matches: (url) => url.startsWith(PREFIX),

  async handle(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const url = req.url ?? "/";

    if (url === `${PREFIX}status` && req.method === "GET") {
      const configs = loadKuwfiConfig();
      sendJson(res, 200, { routers: configs.map((c) => ({ name: c.name, ip: c.ip })) });
      return;
    }

    if (url.startsWith(PREFIX) && req.method === "GET") {
      const after = url.slice(PREFIX.length);
      const parts = after.split("/");
      const routerId = parts[0];

      const cfg = loadKuwfiConfig().find((r) => r.name === routerId);
      if (!cfg) {
        sendJson(res, 404, { error: `Router '${routerId}' not found` });
        return;
      }

      const subpath = parts[1] ?? "";

      try {
        if (subpath === "bandwidth") {
          const data = await fetchKuwfiBandwidth(cfg);
          sendJson(res, 200, data);
          return;
        }

        const result = await fetchKuwfiRouter(cfg);
        sendJson(res, 200, result);
        return;
      } catch (err) {
        sendJson(res, 500, { error: (err as Error).message });
        return;
      }
    }

    sendJson(res, 404, { error: "not found" });
  },

  async fetchTopologySegments(hostnameMap: Map<string, string>): Promise<MapAccessPoint[]> {
    const routers = await fetchAllKuwfiRouters();
    return routers.map((r) => {
      const clients: MapClient[] = r.accessPoints.flatMap((ap) =>
        ap.clients.map((c) => ({
          mac: c.mac,
          hostname: hostnameMap.get(c.mac.toUpperCase()),
          signal_dbm: c.signal_dbm,
        })),
      );
      return {
        id: `kuwfi-${r.ip}`,
        label: r.name,
        sublabel: r.ip,
        kind: "kuwfi",
        online: r.online,
        clients,
      };
    });
  },
};
