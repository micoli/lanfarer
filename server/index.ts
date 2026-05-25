import http from "node:http";
import { PORT, isDev, BBOX_PASSWORD, BASE_PATH, BBOX_TARGET, BBOX_HOST, BBOX_OVERRIDE_IP, VERBOSE } from "./config.ts";
import { runCodegen } from "./codegen.ts";
import { ensureSession } from "./session.ts";
import { bboxApiProxy } from "./bboxApiProxy.ts";
import { handleHealth } from "./routes/health.ts";
import { handleScan } from "./routes/scan.ts";
import { handleCheckIp } from "./routes/check-ip.ts";
import { handleAuthRoute, requireAuth } from "./routes/auth.ts";
import { handleCudy } from "./routes/cudy.ts";
import { handleUiConfig } from "./routes/ui-config.ts";
import { serveStatic } from "./static.ts";

async function main() {
  if (isDev) await runCodegen();

  console.log(`[config] BBOX_TARGET=${BBOX_TARGET} BBOX_HOST=${BBOX_HOST} BBOX_OVERRIDE_IP=${BBOX_OVERRIDE_IP ?? "(none)"} PASSWORD=${BBOX_PASSWORD ? "set" : "MISSING (vérifiez config.yaml)"}`);


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

    if (url.startsWith("/bbox-api")) {
      if (!requireAuth(req, res)) return;
      await bboxApiProxy(req, res);
      return;
    }

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

    if (url.startsWith("/__cudy")) {
      if (!requireAuth(req, res)) return;
      await handleCudy(req, res);
      return;
    }

    if (url === "/__config/ui") {
      if (!requireAuth(req, res)) return;
      handleUiConfig(req, res);
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
