import type http from "node:http";
import type { RouterPlugin } from "../plugin.ts";
import type { MapTopology } from "../../plugins/contracts.ts";
import { sendJson } from "../utils.ts";

export function createMapTopologyHandler(
  plugins: RouterPlugin[],
): (req: http.IncomingMessage, res: http.ServerResponse) => Promise<void> {
  return async function handleMapTopology(_req, res) {
    // Pass 1: collect hostnames from plugins that provide them
    const hostnameMap = new Map<string, string>();
    for (const plugin of plugins) {
      if (plugin.fetchHostnames) {
        const m = await plugin.fetchHostnames();
        for (const [mac, name] of m) hostnameMap.set(mac, name);
      }
    }

    // Pass 2: collect topology segments from all plugins
    const segments = await Promise.all(
      plugins
        .filter((p) => p.fetchTopologySegments)
        .map((p) => p.fetchTopologySegments!(hostnameMap)),
    );

    const topology: MapTopology = { accessPoints: segments.flat() };
    sendJson(res, 200, topology);
  };
}
