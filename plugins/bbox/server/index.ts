import type http from "node:http";
import type { RouterPlugin } from "../../../server/plugin.ts";
import { bboxApiProxy } from "./proxy.ts";

export const plugin: RouterPlugin = {
  type: "bbox",
  matches: (url) => url.startsWith("/devices/api-proxy/bbox-proxy/bbox"),
  handle: (req: http.IncomingMessage, res: http.ServerResponse) => bboxApiProxy(req, res),
};
