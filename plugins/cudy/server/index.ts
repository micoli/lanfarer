import type http from "node:http";
import type { RouterPlugin } from "../../../server/plugin.ts";
import { handleCudy } from "./routes.ts";

export const plugin: RouterPlugin = {
  type: "cudy",
  matches: (url) => url.startsWith("/devices/api-proxy/cudy-proxy/") || url.startsWith("/__cudy"),
  handle: (req: http.IncomingMessage, res: http.ServerResponse) => handleCudy(req, res),
};
