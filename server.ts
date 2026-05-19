import http from "node:http";
import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import os from "node:os";
import dns from "node:dns/promises";
import net from "node:net";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

// ── Configuration ─────────────────────────────────────────────────────────────

// Load .env.local (not committed) — values are overridden by actual env vars
function loadEnvLocal(): void {
  try {
    const raw = fs.readFileSync(".env.local", "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // File absent is fine
  }
}

loadEnvLocal();

const BBOX_TARGET   = process.env.BBOX_TARGET   ?? "https://mabbox.bytel.fr";
const BBOX_HOST     = process.env.BBOX_HOST     ?? "mabbox.bytel.fr";
const BBOX_PASSWORD = process.env.BBOX_PASSWORD ?? "";
const PORT          = parseInt(process.env.PORT ?? "5176", 10);
const isDev         = process.env.NODE_ENV !== "production";
const VERBOSE       = !!process.env.BBOX_VERBOSE;

const targetUrl = new URL(BBOX_TARGET);
const isHttps   = targetUrl.protocol === "https:";

// ── HTTP helpers (adapted from bbox-proxy-plugin.ts) ──────────────────────────

const REDIRECT_CODES = new Set([301, 302, 303, 307, 308]);
const MAX_REDIRECTS  = 5;

function extractCookieValue(setCookieHeaders: string[], name: string): string {
  const re = new RegExp(`${name}=([^;]+)`, "i");
  for (const h of setCookieHeaders) {
    const m = h.match(re);
    if (m) return m[1];
  }
  return "";
}

interface Captured { bboxId: string; btoken: string }

function makeRequest(
  opts: https.RequestOptions,
  body: Buffer,
  depth: number,
  captured: Captured,
  resolve: (statusCode: number, headers: http.IncomingHttpHeaders, body: Buffer) => void,
  reject: (err: Error) => void,
): void {
  if (depth > MAX_REDIRECTS) { reject(new Error("Too many redirects")); return; }

  const transport = opts.protocol === "http:" ? http : https;
  const req = transport.request(opts, (res) => {
    const chunks: Buffer[] = [];
    res.on("data", (c: Buffer) => chunks.push(c));
    res.on("end", () => {
      const responseBody = Buffer.concat(chunks);
      const setCookies = res.headers["set-cookie"] ?? [];

      if (VERBOSE) {
        console.log(`[proxy] hop depth=${depth} status=${res.statusCode} path=${opts.path}`);
        if (responseBody.length) console.log(`[proxy] body:`, responseBody.toString().slice(0, 300));
      }

      const bboxId = extractCookieValue(setCookies, "BBOX_ID");
      if (bboxId) captured.bboxId = bboxId;

      const btoken = extractCookieValue(setCookies, "btoken");
      if (btoken) captured.btoken = btoken;

      if (REDIRECT_CODES.has(res.statusCode ?? 0) && res.headers.location) {
        const location = res.headers.location;
        const redirectUrl = location.startsWith("http")
          ? new URL(location)
          : new URL(location, `${opts.protocol}//${opts.hostname}`);

        const isRedirectHttps = redirectUrl.protocol === "https:";
        const redirectHeaders: http.OutgoingHttpHeaders = {
          ...(opts.headers as http.OutgoingHttpHeaders),
          host: redirectUrl.host,
        };
        const cookieParts: string[] = [];
        if (captured.bboxId) cookieParts.push(`BBOX_ID=${captured.bboxId}`);
        if (captured.btoken) cookieParts.push(`btoken=${captured.btoken}`);
        if (cookieParts.length) redirectHeaders["cookie"] = cookieParts.join("; ");

        makeRequest(
          {
            hostname: redirectUrl.hostname,
            port: redirectUrl.port ? Number(redirectUrl.port) : isRedirectHttps ? 443 : 80,
            path: redirectUrl.pathname + redirectUrl.search,
            method: res.statusCode === 303 ? "GET" : opts.method,
            headers: redirectHeaders,
            protocol: redirectUrl.protocol,
            rejectUnauthorized: false,
          },
          res.statusCode === 303 ? Buffer.alloc(0) : body,
          depth + 1,
          captured,
          resolve,
          reject,
        );
      } else {
        resolve(res.statusCode ?? 502, res.headers, responseBody);
      }
    });
    res.on("error", reject);
  });

  req.on("error", reject);
  if (body.length) req.write(body);
  req.end();
}

function makeRequestAsync(
  opts: https.RequestOptions,
  body: Buffer,
  captured: Captured,
): Promise<{ statusCode: number; headers: http.IncomingHttpHeaders; body: Buffer }> {
  return new Promise((resolve, reject) =>
    makeRequest(opts, body, 0, captured, (statusCode, headers, body) => resolve({ statusCode, headers, body }), reject),
  );
}

// ── Session management ────────────────────────────────────────────────────────

interface Session { bboxId: string; btoken: string }

let session: Session | null = null;
let loginInProgress: Promise<void> | null = null;

function sha1hex(s: string): string {
  return crypto.createHash("sha1").update(s).digest("hex");
}

async function tryLogin(password: string, captured: Captured): Promise<number> {
  const body = Buffer.from(new URLSearchParams({ password }).toString());
  const cookieParts: string[] = [];
  const loginHeaders: http.OutgoingHttpHeaders = {
    host: BBOX_HOST,
    "content-type": "application/x-www-form-urlencoded",
    "content-length": body.length,
    "user-agent": "Mozilla/5.0",
    "x-requested-with": "XmlHttpRequest",
    origin: `https://${BBOX_HOST}`,
    referer: `https://${BBOX_HOST}/login.html`,
  };
  if (cookieParts.length) loginHeaders["cookie"] = cookieParts.join("; ");

  const { statusCode, headers: loginResponseHeaders, body: responseBody } = await makeRequestAsync(
    {
      hostname: targetUrl.hostname,
      port: targetUrl.port ? Number(targetUrl.port) : isHttps ? 443 : 80,
      path: "/api/v1/login",
      method: "POST",
      headers: loginHeaders,
      protocol: targetUrl.protocol,
      rejectUnauthorized: false,
    },
    body,
    captured,
  );

  console.log(`[server] login status=${statusCode} set-cookie:`, loginResponseHeaders["set-cookie"] ?? "(none)");
  console.log(`[server] login body: ${responseBody.toString().slice(0, 500)}`);

  // btoken may be in the JSON response body rather than Set-Cookie
  if (!captured.btoken && responseBody.length) {
    try {
      const text = responseBody.toString();
      const json = JSON.parse(text);
      const bt =
        json?.btoken ??
        json?.[0]?.btoken ??
        json?.login?.btoken ??
        json?.[0]?.login?.btoken;
      if (bt) captured.btoken = bt;
    } catch { /* not JSON */ }
  }

  return statusCode;
}

async function fetchBToken(bboxId: string): Promise<string> {
  // btoken is server-issued via GET /api/v1/device/token — NOT client-generated
  const captured: Captured = { bboxId, btoken: "" };
  const { statusCode, body } = await makeRequestAsync(
    {
      hostname: targetUrl.hostname,
      port: targetUrl.port ? Number(targetUrl.port) : isHttps ? 443 : 80,
      path: "/api/v1/device/token",
      method: "GET",
      headers: {
        host: BBOX_HOST,
        "user-agent": "Mozilla/5.0",
        accept: "application/json",
        cookie: `BBOX_ID=${bboxId}`,
      },
      protocol: targetUrl.protocol,
      rejectUnauthorized: false,
    },
    Buffer.alloc(0),
    captured,
  );
  try {
    const json = JSON.parse(body.toString());
    const token = json?.[0]?.device?.token ?? json?.device?.token ?? json?.token ?? "";
    console.log(`[server] GET /api/v1/device/token → ${statusCode} token: ${token ? token.slice(0, 12) + "…" : "(vide)"}`);
    return token as string;
  } catch {
    console.log(`[server] GET /api/v1/device/token → ${statusCode} body: ${body.toString().slice(0, 200)}`);
    return "";
  }
}

async function doLogin(): Promise<void> {
  if (!BBOX_PASSWORD) return;

  const captured: Captured = { bboxId: "", btoken: "" };

  let status = await tryLogin(BBOX_PASSWORD, captured);
  if (status === 401) {
    status = await tryLogin(sha1hex(BBOX_PASSWORD), captured);
  }

  if (status === 401 || !captured.bboxId) {
    console.error("[server] Authentification Bbox échouée — vérifiez BBOX_PASSWORD");
    session = null;
    return;
  }

  const btoken = await fetchBToken(captured.bboxId);

  session = { bboxId: captured.bboxId, btoken };
  console.log(`[server] Session établie — bboxId: ${session.bboxId.slice(0, 12)}… btoken: ${session.btoken.slice(0, 20)}…`);
}

async function ensureSession(): Promise<Session | null> {
  if (session) return session;
  if (!BBOX_PASSWORD) return null;
  if (loginInProgress) { await loginInProgress; return session; }
  loginInProgress = doLogin().finally(() => { loginInProgress = null; });
  await loginInProgress;
  return session;
}

// ── Proxy handler ─────────────────────────────────────────────────────────────

async function proxyRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
): Promise<void> {
  const chunks: Buffer[] = [];
  await new Promise<void>((resolve) => {
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", resolve);
  });
  let body = Buffer.concat(chunks);
  const method = req.method ?? "GET";
  const rawPath = (req.url ?? "/").slice("/bbox-api".length) || "/";
  const contentType = req.headers["content-type"] ?? "";

  // Convert JSON body to form-urlencoded for the Bbox router
  if (contentType.includes("application/json") && body.length) {
    try {
      const json = JSON.parse(body.toString()) as Record<string, unknown>;
      const form = new URLSearchParams(
        Object.entries(json).map(([k, v]) => [k, String(v)])
      ).toString();
      body = Buffer.from(form);
      req.headers["content-type"] = "application/x-www-form-urlencoded";
    } catch {
      // Leave body as-is if parsing fails
    }
  }

  await dispatchProxy(method, rawPath, req.headers, body, res, false);
}

async function dispatchProxy(
  method: string,
  rawPath: string,
  reqHeaders: http.IncomingHttpHeaders,
  body: Buffer,
  res: http.ServerResponse,
  retry: boolean,
): Promise<void> {
  const sess = await ensureSession();

  const headers: http.OutgoingHttpHeaders = {};
  for (const [k, v] of Object.entries(reqHeaders)) {
    if (["host", "connection", "transfer-encoding"].includes(k)) continue;
    headers[k] = v;
  }
  headers["host"] = BBOX_HOST;
  if (body.length) headers["content-length"] = body.length;
  if (sess) {
    const cookieParts = [`BBOX_ID=${sess.bboxId}`];
    if (sess.btoken) cookieParts.push(`btoken=${sess.btoken}`);
    headers["cookie"] = cookieParts.join("; ");
  }

  // Append ?btoken= for CSRF-protected methods
  let reqPath = rawPath;
  if (["POST", "PUT", "DELETE"].includes(method) && sess?.btoken) {
    const sep = reqPath.includes("?") ? "&" : "?";
    reqPath += `${sep}btoken=${encodeURIComponent(sess.btoken)}`;
  }

  console.log(`[proxy] ${method} ${reqPath}`);

  const captured: Captured = { bboxId: sess?.bboxId ?? "", btoken: sess?.btoken ?? "" };

  let statusCode: number;
  let responseHeaders: http.IncomingHttpHeaders;
  let responseBody: Buffer;

  try {
    ({ statusCode, headers: responseHeaders, body: responseBody } = await makeRequestAsync(
      {
        hostname: targetUrl.hostname,
        port: targetUrl.port ? Number(targetUrl.port) : isHttps ? 443 : 80,
        path: reqPath,
        method,
        headers,
        protocol: targetUrl.protocol,
        rejectUnauthorized: false,
      },
      body,
      captured,
    ));
  } catch (err) {
    console.error(`[proxy] ${method} ${reqPath} → 502`, (err as Error).message);
    res.writeHead(502);
    res.end(`Proxy error: ${(err as Error).message}`);
    return;
  }

  // Update session with any fresh cookies
  if (captured.bboxId && sess) sess.bboxId = captured.bboxId;
  if (captured.btoken && sess) sess.btoken = captured.btoken;

  console.log(`[proxy] ${method} ${reqPath} → ${statusCode}`);

  // Re-auth once on 401/403, replaying with the already-buffered body
  if ((statusCode === 401 || statusCode === 403) && !retry) {
    console.log("[server] Token expiré, re-authentification…");
    session = null;
    await ensureSession();
    const newBtoken = (session as Session | null)?.btoken;
    console.log(`[server] Retry ${method} avec btoken: ${newBtoken ? newBtoken.slice(0, 12) + "…" : "(vide)"}`);
    await dispatchProxy(method, rawPath, reqHeaders, body, res, true);
    return;
  }

  const filtered = { ...responseHeaders };
  delete filtered["transfer-encoding"];
  delete filtered["connection"];
  delete filtered["set-cookie"];

  res.writeHead(statusCode, filtered);
  res.end(responseBody);
}

// ── MAC Vendor Database ───────────────────────────────────────────────────────

const MAC_VENDOR_CACHE = "/tmp/fast5688b-mac-vendor-cache.json";
const MAC_VENDOR_TTL   = 24 * 60 * 60 * 1000;

interface MacEntry { macPrefix: string; vendorName: string }
let vendorMap   = new Map<string, string>();
let vendorLoadedAt = 0;

function normaliseOui(mac: string): string {
  return mac.replace(/[:\-.]/g, "").toUpperCase().slice(0, 6);
}

function buildVendorMap(entries: MacEntry[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const e of entries) m.set(normaliseOui(e.macPrefix), e.vendorName);
  return m;
}

async function loadVendorDb(): Promise<void> {
  if (vendorMap.size && Date.now() - vendorLoadedAt < MAC_VENDOR_TTL) return;

  let loaded = false;
  try {
    const res = await fetch("https://maclookup.app/downloads/json-database/get-db", {
      signal: AbortSignal.timeout(30_000),
    });
    if (res.ok) {
      const data = (await res.json()) as MacEntry[];
      fs.writeFileSync(MAC_VENDOR_CACHE, JSON.stringify(data));
      vendorMap = buildVendorMap(data);
      vendorLoadedAt = Date.now();
      loaded = true;
      console.log(`[mac-vendor] DB téléchargée : ${vendorMap.size} entrées`);
    }
  } catch { /* réseau indisponible */ }

  if (!loaded) {
    try {
      const data = JSON.parse(fs.readFileSync(MAC_VENDOR_CACHE, "utf8")) as MacEntry[];
      vendorMap = buildVendorMap(data);
      vendorLoadedAt = Date.now();
      console.log(`[mac-vendor] DB chargée depuis le cache : ${vendorMap.size} entrées`);
    } catch { /* pas de cache */ }
  }
}

function lookupVendor(mac: string): string {
  return vendorMap.get(normaliseOui(mac)) ?? "";
}

// ── Network Scan ──────────────────────────────────────────────────────────────

function detectSubnet(): string {
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const addr of ifaces ?? []) {
      if (addr.family === "IPv4" && !addr.internal) {
        const p = addr.address.split(".");
        return `${p[0]}.${p[1]}.${p[2]}.0/24`;
      }
    }
  }
  return "192.168.1.0/24";
}

function cidrToIps(cidr: string): string[] {
  const [base] = cidr.split("/");
  const p = base.split(".").map(Number);
  return Array.from({ length: 254 }, (_, i) => `${p[0]}.${p[1]}.${p[2]}.${i + 1}`);
}

async function scanIp(ip: string): Promise<{ mac: string; hostname: string } | null> {
  try {
    await execAsync(`ping -c 1 "${ip}"`, { timeout: 2000 });
  } catch {
    return null;
  }
  let mac = "";
  try {
    const { stdout } = await execAsync(`arp -n "${ip}"`);
    const m = stdout.match(/([0-9a-f]{1,2}(?::[0-9a-f]{1,2}){5})/i);
    if (m) mac = m[1].toLowerCase();
  } catch {}
  let hostname = "";
  try {
    const names = await dns.reverse(ip);
    hostname = names[0] ?? "";
  } catch {}
  return { mac, hostname };
}

async function runScan(
  subnet: string,
  send: (event: string, data: string) => void,
  signal: AbortSignal,
): Promise<void> {
  await loadVendorDb();
  const ips = cidrToIps(subnet);
  const total = ips.length;
  let done = 0;
  const detailPromises: Promise<void>[] = [];

  await Promise.all(
    Array.from({ length: 10 }, async (_, worker) => {
      for (let i = worker; i < ips.length; i += 10) {
        if (signal.aborted) return;
        const ip = ips[i];
        const result = await scanIp(ip);
        done++;
        send("progress", JSON.stringify({ done, total }));
        if (result !== null) {
          send("host", JSON.stringify({
            ip,
            mac: result.mac,
            hostname: result.hostname,
            vendor: result.mac ? lookupVendor(result.mac) : "",
            ping: true,
          }));
          detailPromises.push(
            probeHostDetails(ip, result.hostname)
              .then((detail) => { if (!signal.aborted) send("host-detail", JSON.stringify(detail)); })
              .catch(() => {}),
          );
        }
      }
    }),
  );

  await Promise.all(detailPromises);
}

// ── Host Detail Probing ───────────────────────────────────────────────────────

const COMMON_PORTS: Record<number, string> = {
  21: "FTP", 22: "SSH", 23: "Telnet", 25: "SMTP",
  80: "HTTP", 443: "HTTPS", 445: "SMB", 3389: "RDP",
  5900: "VNC", 8080: "HTTP-alt", 8443: "HTTPS-alt",
};

function checkPort(ip: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const s = new net.Socket();
    const t = setTimeout(() => { s.destroy(); resolve(false); }, 800);
    s.connect(port, ip, () => { clearTimeout(t); s.destroy(); resolve(true); });
    s.on("error", () => { clearTimeout(t); resolve(false); });
  });
}

async function scanPorts(ip: string): Promise<number[]> {
  const results = await Promise.all(
    Object.keys(COMMON_PORTS).map(async (p) => {
      const port = Number(p);
      return (await checkPort(ip, port)) ? port : null;
    }),
  );
  return results.filter((p): p is number => p !== null).sort((a, b) => a - b);
}

async function getPingStats(ip: string): Promise<{ min: number; avg: number; max: number } | null> {
  try {
    const { stdout } = await execAsync(`ping -c 3 -i 0.2 "${ip}"`, { timeout: 5000 });
    const m = stdout.match(/(?:round-trip|rtt) min\/avg\/max\/\S+ = ([\d.]+)\/([\d.]+)\/([\d.]+)/);
    if (m) return { min: parseFloat(m[1]), avg: parseFloat(m[2]), max: parseFloat(m[3]) };
  } catch {}
  return null;
}

async function getMdnsName(ip: string, hostname: string): Promise<string> {
  if (hostname.toLowerCase().endsWith(".local")) return hostname;
  try {
    const { stdout } = await execAsync(`avahi-resolve-address "${ip}"`, { timeout: 2000 });
    const m = stdout.match(/\S+\s+(\S+)/);
    if (m?.[1]) return m[1].replace(/\.$/, "");
  } catch {}
  return "";
}

async function getSmbInfo(ip: string): Promise<{ name: string; domain: string } | null> {
  try {
    const { stdout } = await execAsync(`smbutil status "${ip}"`, { timeout: 3000 });
    const name   = stdout.match(/Server:\s*(.+)/i)?.[1]?.trim() ?? "";
    const domain = stdout.match(/Workgroup:\s*(.+)/i)?.[1]?.trim() ?? "";
    if (name) return { name, domain };
  } catch {}
  try {
    const { stdout } = await execAsync(`nmblookup -A "${ip}"`, { timeout: 3000 });
    let name = ""; let domain = "";
    for (const line of stdout.split("\n")) {
      const m = line.match(/\s+(\S+)\s+<([0-9a-f]{2})>/i);
      if (!m) continue;
      if (m[2] === "00" && !name) name = m[1].trim();
      if ((m[2] === "1e" || m[2] === "00") && !domain) domain = m[1].trim();
    }
    if (name) return { name, domain };
  } catch {}
  return null;
}

interface HostDetail {
  ip: string;
  pingStats: { min: number; avg: number; max: number } | null;
  openPorts: number[];
  mdnsName: string;
  smbName: string;
  smbDomain: string;
}

async function probeHostDetails(ip: string, hostname: string): Promise<HostDetail> {
  const [pingStats, openPorts, mdnsName, smbInfo] = await Promise.all([
    getPingStats(ip),
    scanPorts(ip),
    getMdnsName(ip, hostname),
    getSmbInfo(ip),
  ]);
  return {
    ip, pingStats, openPorts,
    mdnsName,
    smbName:   smbInfo?.name   ?? "",
    smbDomain: smbInfo?.domain ?? "",
  };
}

// ── Static file server (production) ──────────────────────────────────────────

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

function serveStatic(distDir: string): (req: http.IncomingMessage, res: http.ServerResponse) => void {
  return (req, res) => {
    const urlPath = (req.url ?? "/").split("?")[0];
    const ext = path.extname(urlPath);

    // Hashed assets get long-lived cache
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

    // SPA fallback
    const index = path.join(distDir, "index.html");
    if (!fs.existsSync(index)) {
      res.writeHead(404);
      res.end("dist/index.html not found — run npm run build first");
      return;
    }
    res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache" });
    fs.createReadStream(index).pipe(res);
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!BBOX_PASSWORD) {
    console.warn("[server] AVERTISSEMENT : BBOX_PASSWORD non défini — les requêtes /bbox-api ne seront pas authentifiées");
  }

  await ensureSession();

  // Will be assigned below before server.listen()
  let appMiddleware: (req: http.IncomingMessage, res: http.ServerResponse, next?: () => void) => void =
    (_req, res) => { res.writeHead(503); res.end("Server not ready"); };

  const server = http.createServer(async (req, res) => {
    const url = req.url ?? "/";

    if (url.startsWith("/bbox-api")) {
      await proxyRequest(req, res);
      return;
    }

    if (url === "/__health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, hasSession: session !== null, target: BBOX_TARGET }));
      return;
    }

    if (url.startsWith("/__scan")) {
      const params = new URL(url, "http://localhost").searchParams;
      const subnet = params.get("subnet") ?? detectSubnet();
      const ac = new AbortController();

      res.writeHead(200, {
        "content-type":  "text/event-stream",
        "cache-control": "no-cache",
        connection:      "keep-alive",
      });

      const send = (event: string, data: string) => {
        if (!res.writableEnded) res.write(`event: ${event}\ndata: ${data}\n\n`);
      };

      req.on("close", () => ac.abort());

      runScan(subnet, send, ac.signal)
        .then(() => send("done", "{}"))
        .catch((err) => send("error", JSON.stringify({ message: (err as Error).message })))
        .finally(() => res.end());
      return;
    }

    if (url.startsWith("/__check-ip")) {
      const ip = new URL(url, "http://localhost").searchParams.get("ip") ?? "";
      if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(ip)) {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid IP" }));
        return;
      }
      let reachable = false;
      let mac: string | null = null;
      try {
        await execAsync(`ping -c 1 "${ip}"`, { timeout: 2000 });
        reachable = true;
      } catch { /* unreachable */ }
      if (reachable) {
        try {
          const { stdout } = await execAsync(`arp -n "${ip}"`);
          const m = stdout.match(/([0-9a-f]{1,2}(?::[0-9a-f]{1,2}){5})/i);
          if (m) mac = m[1].toLowerCase();
        } catch { /* arp unavailable */ }
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ reachable, mac }));
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
    const staticHandler = serveStatic("dist");
    appMiddleware = staticHandler;
  }

  server.listen(PORT, () => {
    console.log(`[server] http://localhost:${PORT} (${isDev ? "dev" : "production"})`);
  });
}

main().catch((err) => {
  console.error("[server] Erreur fatale :", err);
  process.exit(1);
});
