import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { BASE_PATH } from "./config.ts";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js":   "application/javascript",
  ".mjs":  "application/javascript",
  ".css":  "text/css",
  ".json": "application/json",
  ".png":  "image/png",
  ".svg":  "image/svg+xml",
  ".ico":  "image/x-icon",
  ".woff": "font/woff",
  ".woff2":"font/woff2",
};

export function serveStatic(distDir: string): (req: http.IncomingMessage, res: http.ServerResponse) => void {
  return (req, res) => {
    const urlPath = (req.url ?? "/").split("?")[0];
    const ext = path.extname(urlPath);

    const isAsset = /\.(js|css|png|svg|ico|woff2?)$/.test(ext);
    const cacheControl = isAsset ? "public, max-age=31536000, immutable" : "no-cache";

    const candidate = path.join(distDir, urlPath);
    if (ext && fs.existsSync(candidate)) {
      res.writeHead(200, {
        "content-type": MIME[ext] ?? "application/octet-stream",
        "cache-control": cacheControl,
      });
      fs.createReadStream(candidate).pipe(res);
      return;
    }

    const index = path.join(distDir, "index.html");
    if (!fs.existsSync(index)) {
      res.writeHead(404);
      res.end("dist/index.html not found — run npm run build first");
      return;
    }

    // X-Ingress-Path is set by HA ingress proxy (e.g. /api/hassio_ingress/TOKEN).
    // Fall back to BASE_PATH env var (derived from HOSTNAME in run.sh).
    const ingressPath = (req.headers["x-ingress-path"] as string | undefined) ?? BASE_PATH;
    const base = ingressPath ? `${ingressPath}/` : "/";
    const raw = fs.readFileSync(index, "utf8");
    const html = raw.replace(/<head>/i, `<head><base href="${base}">`);
    res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache" });
    res.end(html);
  };
}
