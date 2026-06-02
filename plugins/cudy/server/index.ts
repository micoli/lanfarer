import type http from "node:http";
import type { RouterPlugin } from "../../../server/plugin.ts";
import type { HostConnexion, MapAccessPoint, MapClient } from "../../contracts.ts";
import { handleCudy } from "./routes.ts";
import { fetchAllCudyRouters, fetchCudyDevlist, loadCudyConfig } from "./fetcher.ts";

export const plugin: RouterPlugin = {
  type: "cudy",

  async fetchHosts() {
    const configs = loadCudyConfig();
    const [devlists, routerStats] = await Promise.all([
      Promise.all(configs.map((cfg) => fetchCudyDevlist(cfg))),
      fetchAllCudyRouters(),
    ]);

    const macToSsid = new Map<string, string>();
    const macToConnexion = new Map<string, HostConnexion>();
    for (const router of routerStats) {
      for (const iface of router.interfaces) {
        const wifiConnexion: HostConnexion = iface.band === "5G" ? "wifi 5G" : "wifi 2.4G";
        for (const client of iface.clients) {
          macToSsid.set(client.mac.toUpperCase(), iface.ssid);
          macToConnexion.set(client.mac.toUpperCase(), wifiConnexion);
        }
      }
    }

    const toConnexion = (iface: string): HostConnexion => {
      if (/5g/i.test(iface)) return "wifi 5G";
      if (/2\.4g|wifi/i.test(iface)) return "wifi 2.4G";
      return "wired";
    };
    const seen = new Set<string>();
    const hosts = devlists.flatMap((entries) => (entries ?? []).map((e) => ({
      mac: e.mac,
      ip: e.ip,
      hostname: "",
      active: true,
      connexion: macToConnexion.get(e.mac.toUpperCase()) ?? toConnexion(e.iface),
      ssid: macToSsid.get(e.mac.toUpperCase()),
    }))).filter((h) => {
      const key = h.mac.toUpperCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return { hosts };
  },


  routes: [
    { method: "GET", subpath: "status" },
    { method: "GET", subpath: "{routerId}/wireless" },
    { method: "GET", subpath: "{routerId}/bandwidth" },
    { method: "GET", subpath: "{routerId}/devlist" },
  ],

  matches: (url) => url.startsWith("/devices/api-proxy/cudy/"),

  handle: (req: http.IncomingMessage, res: http.ServerResponse) => handleCudy(req, res),

  async fetchTopologySegments(hostnameMap: Map<string, string>, ipMap: Map<string, string>): Promise<MapAccessPoint[]> {
    const routers = await fetchAllCudyRouters();
    return routers.map((r) => {
      const clients: MapClient[] = r.interfaces.flatMap((iface) =>
        iface.clients.map((c) => ({
          mac: c.mac,
          hostname: hostnameMap.get(c.mac.toUpperCase()),
          ip: ipMap.get(c.mac.toUpperCase()),
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
