import type http from "node:http";
import { fetchCudyRouter, loadCudyConfig } from "./fetcher.ts";

export async function handleCudy(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const url = req.url ?? "/";

  if (url === "/__cudy/status" && req.method === "GET") {
    const configs = loadCudyConfig();
    const payload = JSON.stringify({ configured: configs.length, routers: configs.map((r) => ({ name: r.name, ip: r.ip })) });
    res.writeHead(200, { "content-type": "application/json" });
    res.end(payload);
    return;
  }

  if (url.startsWith("/devices/api-proxy/cudy-proxy/") && req.method === "GET") {
    const afterPrefix = url.slice("/devices/api-proxy/cudy-proxy/".length);
    const routerId = afterPrefix.split("/")[0];
    const cfg = loadCudyConfig().find((r) => r.name === routerId);
    if (!cfg) {
      res.writeHead(404, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: `Router '${routerId}' not found` }));
      return;
    }
    try {
      const result = await fetchCudyRouter(cfg);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: (err as Error).message }));
    }
    return;
  }

  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: "not found" }));
}
