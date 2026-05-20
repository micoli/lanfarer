import type http from "node:http";
import { fetchAllCudyRouters, loadCudyConfig } from "../cudy.ts";

export async function handleCudy(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const url = req.url ?? "/";

  if (url === "/__cudy/status" && req.method === "GET") {
    const configs = loadCudyConfig();
    const payload = JSON.stringify({ configured: configs.length, routers: configs.map((r) => ({ name: r.name, ip: r.ip })) });
    res.writeHead(200, { "content-type": "application/json" });
    res.end(payload);
    return;
  }

  if (url === "/__cudy/clients" && req.method === "GET") {
    try {
      const routers = await fetchAllCudyRouters();
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ routers }));
    } catch (err) {
      res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: (err as Error).message }));
    }
    return;
  }

  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: "not found" }));
}
