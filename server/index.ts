import http from "node:http";
import { PORT, isDev, BBOX_PASSWORD } from "./config.ts";
import { runCodegen } from "./codegen.ts";
import { ensureSession } from "./session.ts";
import { proxyRequest } from "./proxy.ts";
import { handleHealth } from "./routes/health.ts";
import { handleScan } from "./routes/scan.ts";
import { handleCheckIp } from "./routes/check-ip.ts";
import { handleAuthRoute, requireAuth } from "./routes/auth.ts";
import { handleCudy } from "./routes/cudy.ts";
import { serveStatic } from "./static.ts";

async function main() {
  if (isDev) await runCodegen();

  if (!BBOX_PASSWORD) {
    console.warn("[server] AVERTISSEMENT : BBOX_PASSWORD non défini — les requêtes /bbox-api ne seront pas authentifiées");
  }

  await ensureSession();

  let appMiddleware: (req: http.IncomingMessage, res: http.ServerResponse, next?: () => void) => void =
    (_req, res) => { res.writeHead(503); res.end("Server not ready"); };

  const server = http.createServer(async (req, res) => {
    const url = req.url ?? "/";

    if (await handleAuthRoute(req, res)) return;

    if (url.startsWith("/bbox-api")) {
      if (!requireAuth(req, res)) return;
      await proxyRequest(req, res);
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
