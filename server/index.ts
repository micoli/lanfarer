import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import type { IncomingMessage, ServerResponse } from "node:http";
import { AppModule } from "./app.module.ts";
import {
  PORT,
  isDev,
  BASE_PATH,
  BBOX_TARGET,
  BBOX_HOST,
  BBOX_OVERRIDE_IP,
  BBOX_PASSWORD,
  VERBOSE,
} from "./config.ts";
import { runCodegen } from "./codegen.ts";
import { ensureSession } from "./session.ts";
import { serveStatic } from "./static.ts";

function isApiPath(url: string): boolean {
  return url.startsWith("/__") || url.startsWith("/devices/");
}

async function bootstrap() {
  if (isDev) await runCodegen();

  console.log(
    `[config] BBOX_TARGET=${BBOX_TARGET} BBOX_HOST=${BBOX_HOST} BBOX_OVERRIDE_IP=${BBOX_OVERRIDE_IP ?? "(none)"} PASSWORD=${BBOX_PASSWORD ? "set" : "MISSING (vérifiez config.yaml)"}`,
  );
  console.log(`[server] BASE_PATH=${BASE_PATH}`);

  await ensureSession();

  const app = await NestFactory.create(AppModule, { logger: false });

  // 1. Strip ingress/base path prefix — must run first
  app.use((req: IncomingMessage & { url: string }, _res: ServerResponse, next: () => void) => {
    const ingressPath = (req.headers["x-ingress-path"] as string | undefined) ?? BASE_PATH;
    if (VERBOSE) console.log(`[req] ${req.method} ${req.url} base=${ingressPath}`);
    if (ingressPath && req.url.startsWith(ingressPath)) {
      req.url = req.url.slice(ingressPath.length) || "/";
    }
    next();
  });

  // 2. SPA serving — registered BEFORE NestJS routes so Vite/static handles non-API paths
  //    before NestJS's exception handler has a chance to intercept them.
  if (isDev) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      configFile: "./vite.config.ts",
      server: { middlewareMode: true, hmr: { server: app.getHttpServer() } },
      appType: "spa",
      base: "/",
    });
    app.use((req: IncomingMessage & { url: string }, res: ServerResponse, next: () => void) => {
      if (isApiPath(req.url)) return next();
      vite.middlewares(req, res, next);
    });
  } else {
    const staticHandler = serveStatic("dist");
    app.use((req: IncomingMessage & { url: string }, res: ServerResponse, next: () => void) => {
      if (isApiPath(req.url)) return next();
      staticHandler(req, res);
    });
  }

  // 3. NestJS routes handle everything under /__* and /devices/*
  await app.init();

  app.getHttpServer().listen(PORT, () => {
    console.log(`[server] http://localhost:${PORT} (${isDev ? "dev" : "production"})`);
  });
}

bootstrap().catch((err) => {
  console.error("[server] Erreur fatale :", err);
  process.exit(1);
});
