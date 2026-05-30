import type http from "node:http";
import type { RouterPlugin } from "../../../server/plugin.ts";
import type { MapAccessPoint, MapClient } from "../../contracts.ts";
import { loadAllRouters } from "../../../server/config.ts";
import { resolveSpec } from "./client.ts";
import { handleWireless, fetchBboxWireless } from "./routes/wireless.ts";
import { handleWifiSettings } from "./routes/wifiSettings.ts";
import { handleHosts, fetchBboxHosts } from "./routes/hosts.ts";
import { handleDhcp } from "./routes/dhcp.ts";
import { handleDevice } from "./routes/device.ts";
import { handleWan } from "./routes/wan.ts";
import { handleWanGraphs } from "./routes/wanGraphs.ts";
import { sendError } from "./utils.ts";

const PREFIX = "/devices/api-proxy/bbox/";

function parseRoute(url: string): { routerId: string; subpath: string } | null {
  if (!url.startsWith(PREFIX)) return null;
  const after = url.slice(PREFIX.length);
  const slash = after.indexOf("/");
  const routerId = slash === -1 ? after.split("?")[0] : after.slice(0, slash);
  if (!routerId) return null;
  const subpath = slash === -1 ? "/" : after.slice(slash).split("?")[0];
  return { routerId, subpath };
}

function bboxRouterSpecs() {
  return loadAllRouters()
    .filter((r) => r.type === "bbox")
    .flatMap((r) => {
      const spec = resolveSpec(r.name);
      return spec ? [{ name: r.name, spec }] : [];
    });
}

export const plugin: RouterPlugin = {
  type: "bbox",

  async fetchHosts() {
    const results = await Promise.all(bboxRouterSpecs().map(({ spec }) => fetchBboxHosts(spec)));
    const seen = new Set<string>();
    const hosts = results.flatMap((r) => r.hosts).filter((h) => {
      const key = h.mac.toUpperCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return { hosts };
  },

  async fetchHostnames(): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    const results = await Promise.all(bboxRouterSpecs().map(({ spec }) => fetchBboxHosts(spec)));
    for (const { hosts } of results) {
      for (const h of hosts) {
        if (h.hostname) map.set(h.mac.toUpperCase(), h.hostname);
      }
    }
    return map;
  },

  async fetchTopologySegments(hostnameMap: Map<string, string>, ipMap: Map<string, string>): Promise<MapAccessPoint[]> {
    const segments: MapAccessPoint[] = [];
    await Promise.all(
      bboxRouterSpecs().map(async ({ name, spec }) => {
        const wireless = await fetchBboxWireless(spec);
        wireless.accessPoints.forEach((ap, i) => {
          const clients: MapClient[] = ap.clients.map((c) => ({
            mac: c.mac,
            hostname: hostnameMap.get(c.mac.toUpperCase()),
            ip: ipMap.get(c.mac.toUpperCase()),
            signal_dbm: c.signal_dbm,
          }));
          segments.push({
            id: `bbox-${name}-${ap.ssid}-${i}`,
            label: `Bbox — ${ap.ssid}`,
            sublabel: ap.band,
            kind: "bbox-wifi",
            online: wireless.online,
            clients,
          });
        });
      }),
    );
    return segments;
  },

  matches: (url) => url.startsWith(PREFIX),

  async handle(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const parsed = parseRoute(req.url ?? "/");
    if (!parsed) {
      sendError(res, 400, "Missing routerId in bbox path");
      return;
    }

    const { routerId, subpath } = parsed;
    const spec = resolveSpec(routerId);
    if (!spec) {
      sendError(res, 400, `Router '${routerId}' not found in configuration`);
      return;
    }

    if (subpath === "/wireless" && req.method === "GET") {
      await handleWireless(req, res, spec);
      return;
    }

    if (subpath === "/wifi-settings" && req.method === "GET") {
      await handleWifiSettings(req, res, spec);
      return;
    }

    if (subpath === "/hosts" && req.method === "GET") {
      await handleHosts(req, res, spec);
      return;
    }

    if (subpath === "/device" && req.method === "GET") {
      await handleDevice(req, res, spec);
      return;
    }

    if (subpath === "/wan/stats" && req.method === "GET") {
      await handleWan(req, res, spec);
      return;
    }

    if (subpath === "/wan/graphs" && req.method === "GET") {
      await handleWanGraphs(req, res, spec);
      return;
    }

    if (subpath.startsWith("/dhcp")) {
      await handleDhcp(req, res, spec, subpath);
      return;
    }

    // Fallback: pass through to BBox API as-is (for any bbox-specific paths not yet normalized)
    sendError(res, 404, `Unknown bbox route: ${req.method} ${subpath}`);
  },
};
