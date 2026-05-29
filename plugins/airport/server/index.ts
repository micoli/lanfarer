import type http from "node:http";
import type { RouterPlugin } from "../../../server/plugin.ts";
import type { HostsData, MapAccessPoint } from "../../contracts.ts";
import type { AirportHost } from "./fetcher.ts";
import {
  fetchAirportRouter,
  fetchAirportWifiSettings,
  fetchAllAirportRouters,
  loadAirportConfig,
} from "./fetcher.ts";
import { fetchAcpRawProps, fetchAcpWireless } from "./acp-client.ts";
import { acpProbe, fetchAcpDeviceInfo } from "./acp.ts";

const PREFIX = "/devices/api-proxy/airport-proxy/";

function sendJson(res: http.ServerResponse, status: number, data: unknown): void {
  const body = JSON.stringify(data);
  res.writeHead(status, { "content-type": "application/json", "content-length": Buffer.byteLength(body) });
  res.end(body);
}

export const plugin: RouterPlugin = {
  type: "airport",

  async fetchHosts(): Promise<HostsData> {
    const routers = await fetchAllAirportRouters();
    const seen = new Set<string>();
    const hosts = routers.flatMap((r) =>
      r.hosts.map((h: AirportHost) => ({
        mac: h.mac,
        ip: h.ip,
        hostname: h.hostname,
        active: true,
        connexion: h.wireless ? ("wifi 2.4G" as const) : ("wired" as const),
      })),
    ).filter((h) => {
      const key = h.mac.toUpperCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return { hosts };
  },

  async fetchTopologySegments(
    hostnameMap: Map<string, string>,
    ipMap: Map<string, string>,
  ): Promise<MapAccessPoint[]> {
    const routers = await fetchAllAirportRouters();
    return routers.map((r) => ({
      id: `airport-${r.ip}`,
      label: r.name,
      sublabel: r.ip,
      kind: "airport",
      online: r.online,
      clients: r.hosts.map((h: AirportHost) => ({
        mac: h.mac,
        hostname: hostnameMap.get(h.mac.toUpperCase()) ?? h.hostname,
        ip: ipMap.get(h.mac.toUpperCase()) ?? h.ip,
      })),
    }));
  },

  matches: (url) => url.startsWith(PREFIX),

  async handle(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const url = req.url ?? "/";

    if (url === `${PREFIX}status` && req.method === "GET") {
      const configs = loadAirportConfig();
      sendJson(res, 200, { routers: configs.map((c) => ({ name: c.name, ip: c.ip })) });
      return;
    }

    if (url.startsWith(PREFIX) && req.method === "GET") {
      const after = url.slice(PREFIX.length);
      const parts = after.split("/");
      const routerId = parts[0];
      const subpath = parts[1] ?? "hosts";

      const cfg = loadAirportConfig().find((r) => r.name === routerId);
      if (!cfg) {
        sendJson(res, 404, { error: `Router '${routerId}' not found` });
        return;
      }

      try {
        if (subpath === "hosts") {
          const result = await fetchAirportRouter(cfg);
          sendJson(res, 200, { online: result.online, hosts: result.hosts });
          return;
        }

        if (subpath === "wifi-settings") {
          const data = await fetchAirportWifiSettings(cfg);
          sendJson(res, 200, data);
          return;
        }

        if (subpath === "wireless") {
          const data = await fetchAcpWireless(cfg.ip, cfg.password ?? "");
          sendJson(res, 200, data);
          return;
        }

        if (subpath === "raw-props") {
          const data = await fetchAcpRawProps(cfg.ip, cfg.password ?? "");
          sendJson(res, 200, data);
          return;
        }

        if (subpath === "device-info") {
          const info = await fetchAcpDeviceInfo(cfg.ip);
          sendJson(res, 200, info ?? {});
          return;
        }

        if (subpath === "acp-debug") {
          const exchanges = await acpProbe(cfg.ip);
          sendJson(res, 200, { exchanges });
          return;
        }

      } catch (err) {
        sendJson(res, 500, { error: (err as Error).message });
        return;
      }
    }

    sendJson(res, 404, { error: "not found" });
  },
};
