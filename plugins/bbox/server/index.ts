import type http from "node:http";
import type { RouterPlugin } from "../../../server/plugin.ts";
import { resolveSpec } from "./client.ts";
import { handleWireless } from "./routes/wireless.ts";
import { handleWifiSettings } from "./routes/wifiSettings.ts";
import { handleHosts } from "./routes/hosts.ts";
import { handleDhcp } from "./routes/dhcp.ts";
import { handleDevice } from "./routes/device.ts";
import { handleWan } from "./routes/wan.ts";
import { handleWanGraphs } from "./routes/wanGraphs.ts";
import { sendError } from "./utils.ts";

const PREFIX = "/devices/api-proxy/bbox-proxy/";

function parseRoute(url: string): { routerId: string; subpath: string } | null {
  if (!url.startsWith(PREFIX)) return null;
  const after = url.slice(PREFIX.length);
  const slash = after.indexOf("/");
  const routerId = slash === -1 ? after.split("?")[0] : after.slice(0, slash);
  if (!routerId) return null;
  const subpath = slash === -1 ? "/" : after.slice(slash).split("?")[0];
  return { routerId, subpath };
}

export const plugin: RouterPlugin = {
  type: "bbox",

  matches: (url) => url.startsWith(PREFIX),

  async handle(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const parsed = parseRoute(req.url ?? "/");
    if (!parsed) {
      sendError(res, 400, "Missing routerId in bbox-proxy path");
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
