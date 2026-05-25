import type http from "node:http";
import type { RouterPlugin } from "../../../server/plugin.ts";
import type { MapAccessPoint, MapClient } from "../../contracts.ts";
import { handleCudy } from "./routes.ts";
import { fetchAllCudyRouters } from "./fetcher.ts";

export const plugin: RouterPlugin = {
  type: "cudy",

  matches: (url) => url.startsWith("/devices/api-proxy/cudy-proxy/"),

  handle: (req: http.IncomingMessage, res: http.ServerResponse) => handleCudy(req, res),

  async fetchTopologySegments(hostnameMap: Map<string, string>): Promise<MapAccessPoint[]> {
    const routers = await fetchAllCudyRouters();
    return routers.map((r) => {
      const clients: MapClient[] = r.interfaces.flatMap((iface) =>
        iface.clients.map((c) => ({
          mac: c.mac,
          hostname: hostnameMap.get(c.mac.toUpperCase()),
          signal_dbm: c.signal_dbm,
        })),
      );
      return {
        id: `cudy-${r.ip}`,
        label: r.name,
        sublabel: r.ip,
        kind: "cudy",
        online: r.online,
        clients,
      };
    });
  },
};
