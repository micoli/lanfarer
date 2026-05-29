import http from "node:http";
import { PORT, isDev, BBOX_PASSWORD, BASE_PATH, BBOX_TARGET, BBOX_HOST, BBOX_OVERRIDE_IP, VERBOSE } from "./config.ts";
import { runCodegen } from "./codegen.ts";
import { ensureSession } from "./session.ts";
import { handleHealth } from "./routes/health.ts";
import { handleScan } from "./routes/scan.ts";
import { handleCheckIp } from "./routes/check-ip.ts";
import { handleAuthRoute, requireAuth } from "./routes/auth.ts";
import { handleUiConfig } from "./routes/ui-config.ts";
import { handleRouters } from "./routes/routers.ts";
import { handleOui } from "./routes/oui.ts";
import { createMapTopologyHandler } from "./routes/mapTopology.ts";
import { handleHosts } from "./routes/hosts.ts";
import { serveStatic } from "./static.ts";
import fs from "node:fs";
import path from "node:path";
import type { RouterPlugin } from "./plugin.ts";

async function loadPlugins(): Promise<RouterPlugin[]> {
  const pluginsDir = path.resolve("plugins");
  if (!fs.existsSync(pluginsDir)) return [];
  const plugins: RouterPlugin[] = [];
  for (const name of fs.readdirSync(pluginsDir).sort()) {
    const entry = path.join(pluginsDir, name, "server", "index.ts");
    if (!fs.existsSync(entry)) continue;
    try {
      const mod = (await import(entry)) as { plugin?: RouterPlugin };
      if (mod.plugin) {
        plugins.push(mod.plugin);
        console.log(`[plugins] loaded: ${name}`);
      }
    } catch (err) {
      console.warn(`[plugins] failed to load ${name}:`, err);
    }
  }
  return plugins;
}

async function main() {
  if (isDev) await runCodegen();

  console.log(`[config] BBOX_TARGET=${BBOX_TARGET} BBOX_HOST=${BBOX_HOST} BBOX_OVERRIDE_IP=${BBOX_OVERRIDE_IP ?? "(none)"} PASSWORD=${BBOX_PASSWORD ? "set" : "MISSING (vérifiez config.yaml)"}`);

  const routerPlugins = await loadPlugins();
  const handleMapTopology = createMapTopologyHandler(routerPlugins);

  await ensureSession();

  let appMiddleware: (req: http.IncomingMessage, res: http.ServerResponse, next?: () => void) => void =
    (_req, res) => { res.writeHead(503); res.end("Server not ready"); };

  console.log(`[server] BASE_PATH=${BASE_PATH}`);

  const server = http.createServer(async (req, res) => {
    const ingressPath = (req.headers["x-ingress-path"] as string | undefined) ?? BASE_PATH;
    if (VERBOSE) console.log(`[req] ${req.method} ${req.url} x-ingress-path=${req.headers["x-ingress-path"] ?? "-"} base=${ingressPath}`);
    if (ingressPath && req.url?.startsWith(ingressPath)) {
      req.url = req.url.slice(ingressPath.length) || "/";
    }
    const url = req.url ?? "/";

    if (await handleAuthRoute(req, res)) return;

    if (url === "/__health") {
      handleHealth(req, res);
      return;
    }

    if (url.startsWith("/__scan")) {
      if (!requireAuth(req, res)) return;
      await handleScan(req, res);
      return;
    }

    if (url.startsWith("/__check-ip")) {
      if (!requireAuth(req, res)) return;
      await handleCheckIp(req, res);
      return;
    }

    for (const plugin of routerPlugins) {
      if (plugin.matches(url)) {
        if (!requireAuth(req, res)) return;
        await plugin.handle(req, res);
        return;
      }
    }

    if (url === "/__hosts" && req.method === "GET") {
      if (!requireAuth(req, res)) return;
      await handleHosts(req, res, routerPlugins);
      return;
    }

    if (url === "/__map/topology" && req.method === "GET") {
      if (!requireAuth(req, res)) return;
      await handleMapTopology(req, res);
      return;
    }

    if (url === "/__config/ui") {
      if (!requireAuth(req, res)) return;
      handleUiConfig(req, res);
      return;
    }

    if (url === "/__config/routers") {
      if (!requireAuth(req, res)) return;
      handleRouters(req, res);
      return;
    }

    if (url.startsWith("/__oui")) {
      if (!requireAuth(req, res)) return;
      await handleOui(req, res);
      return;
    }

    appMiddleware(req, res);
  });

  if (isDev) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      configFile: "./vite.config.ts",
      server: { middlewareMode: true, hmr: { server } },
      appType: "spa",
      base: "/",
    });

    appMiddleware = (req, res, _next) => vite.middlewares(req, res, () => {
      res.writeHead(404);
      res.end();
    });
  } else {
    appMiddleware = serveStatic("dist");
  }

  server.listen(PORT, () => {
    console.log(`[server] http://localhost:${PORT} (${isDev ? "dev" : "production"})`);
  });
}

main().catch((err) => {
  console.error("[server] Erreur fatale :", err);
  process.exit(1);
});
