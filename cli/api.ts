#!/usr/bin/env tsx
import "./env.ts";
import { EventEmitter } from "node:events";
import type http from "node:http";
import fs from "node:fs";
import { parse as parseYaml } from "yaml";

import { handleHealth } from "../server/routes/health.ts";
import { handleScan } from "../server/routes/scan.ts";
import { handlePing } from "../server/routes/ping.ts";
import { handleHosts } from "../server/routes/hosts.ts";
import { createMapTopologyHandler } from "../server/routes/mapTopology.ts";
import { handleCheckIp } from "../server/routes/check-ip.ts";
import { handleOui } from "../server/routes/oui.ts";
import { handleRouters } from "../server/routes/routers.ts";
import { handleUiConfig } from "../server/routes/ui-config.ts";
import { handleAuthRoute } from "../server/routes/auth.ts";
import { loadPlugins } from "../server/plugins.ts";
import { CONFIG_FILE, loadAllRouters } from "../server/config.ts";
import { login, isAuthEnabled } from "../server/auth.ts";

// ── Parse args ─────────────────────────────────────────────────────────────────

const rawArgs = process.argv.slice(2);
const routePath = rawArgs[0];

let method = "GET";
const kvArgs: Record<string, string> = {};

for (let i = 1; i < rawArgs.length; i++) {
  if (rawArgs[i] === "--method" && rawArgs[i + 1]) {
    method = rawArgs[++i].toUpperCase();
    continue;
  }
  const eq = rawArgs[i].indexOf("=");
  if (eq !== -1) {
    kvArgs[rawArgs[i].slice(0, eq)] = rawArgs[i].slice(eq + 1);
  }
}

// ── Mock req/res ───────────────────────────────────────────────────────────────

class MockRequest extends EventEmitter {
  url: string;
  method: string;
  headers: Record<string, string>;

  constructor(url: string, reqMethod: string, headers: Record<string, string> = {}, body?: string) {
    super();
    this.url = url;
    this.method = reqMethod;
    this.headers = headers;
    process.nextTick(() => {
      if (body) this.emit("data", body);
      this.emit("end");
    });
  }
}

class MockResponse {
  statusCode = 200;
  writableEnded = false;
  private contentType = "";
  private buffer = "";
  private sseBuffer = "";

  writeHead(status: number, headers?: Record<string, string | string[]>): this {
    this.statusCode = status;
    const ct = headers?.["content-type"];
    if (ct) this.contentType = Array.isArray(ct) ? ct[0] : ct;
    return this;
  }

  write(chunk: Buffer | string): boolean {
    if (this.writableEnded) return false;
    const str = typeof chunk === "string" ? chunk : chunk.toString("utf8");
    if (this.contentType.includes("text/event-stream")) {
      this.sseBuffer += str;
      this.flushSseEvents();
    } else {
      this.buffer += str;
    }
    return true;
  }

  end(chunk?: Buffer | string | null): this {
    if (chunk) this.write(chunk as Buffer | string);
    this.writableEnded = true;
    if (!this.contentType.includes("text/event-stream") && this.buffer) {
      try {
        console.log(JSON.stringify(JSON.parse(this.buffer), null, 2));
      } catch {
        console.log(this.buffer);
      }
    }
    return this;
  }

  private flushSseEvents(): void {
    const blocks = this.sseBuffer.split("\n\n");
    this.sseBuffer = blocks.pop() ?? "";
    for (const block of blocks) {
      if (!block.trim()) continue;
      let eventName = "message";
      let data = "";
      for (const line of block.split("\n")) {
        if (line.startsWith("event: ")) eventName = line.slice(7).trim();
        else if (line.startsWith("data: ")) data = line.slice(6).trim();
      }
      if (!data) continue;
      try {
        console.log(`[${eventName}] ${JSON.stringify(JSON.parse(data), null, 2)}`);
      } catch {
        console.log(`[${eventName}] ${data}`);
      }
    }
  }
}

// ── Auth ───────────────────────────────────────────────────────────────────────

function loadCliCredentials(): { username: string; password: string } | null {
  try {
    const raw = fs.readFileSync(CONFIG_FILE, "utf8");
    const data = parseYaml(raw) as Record<string, unknown>;
    const password = data.cli_password as string | undefined;
    if (!password) return null;
    const username = (data.cli_user as string | undefined) ?? "cli";
    return { username, password };
  } catch {
    return null;
  }
}

async function getSessionToken(): Promise<string | null> {
  if (!isAuthEnabled()) return null;
  const creds = loadCliCredentials();
  if (!creds) return null;
  const token = await login(creds.username, creds.password);
  if (!token) {
    console.error("Warning: CLI login failed — check cli_user/cli_password in config.yaml");
  }
  return token ?? null;
}

// ── Help ───────────────────────────────────────────────────────────────────────

interface CliRoute { path: string; method: string; params?: string[] }

const BUILTIN_ROUTES: CliRoute[] = [
  { path: "__health",         method: "GET" },
  { path: "__scan",           method: "GET",  params: ["subnet"] },
  { path: "__ping",           method: "GET",  params: ["ips"] },
  { path: "__hosts",          method: "GET" },
  { path: "__map/topology",   method: "GET" },
  { path: "__check-ip",       method: "GET",  params: ["ip"] },
  { path: "__oui",            method: "GET",  params: ["mac"] },
  { path: "__config/routers", method: "GET" },
  { path: "__config/ui",      method: "GET" },
  { path: "__auth/me",        method: "GET" },
  { path: "__auth/login",     method: "POST", params: ["username", "password"] },
  { path: "__auth/logout",    method: "POST" },
];

function fmtParams(params?: string[]): string {
  return params?.length ? `  [${params.map((p) => `${p}=...`).join(" ")}]` : "";
}

async function showHelp(): Promise<void> {
  console.log("Usage: npm run api -- <path> [key=value...] [--method GET|POST|PUT|DELETE]\n");
  console.log("Built-in routes:");
  for (const r of BUILTIN_ROUTES) {
    console.log(`  ${r.method.padEnd(6)} ${r.path}${fmtParams(r.params)}`);
  }

  const [plugins, routers] = await Promise.all([loadPlugins(), Promise.resolve(loadAllRouters())]);

  console.log("\nPlugin routes:");
  for (const plugin of plugins) {
    const pluginRouters = routers.filter((r) => r.type === plugin.type);
    if (!plugin.routes) {
      for (const router of pluginRouters) {
        console.log(`  *      devices/api-proxy/${plugin.type}/${router.name}/*`);
      }
      continue;
    }
    for (const route of plugin.routes) {
      if (!route.subpath.includes("{routerId}")) {
        console.log(`  ${route.method.padEnd(6)} devices/api-proxy/${plugin.type}/${route.subpath}${fmtParams(route.params)}`);
      } else {
        for (const router of pluginRouters) {
          const expanded = route.subpath.replace("{routerId}", router.name);
          console.log(`  ${route.method.padEnd(6)} devices/api-proxy/${plugin.type}/${expanded}${fmtParams(route.params)}`);
        }
      }
    }
  }
}

// ── Dispatch ───────────────────────────────────────────────────────────────────

async function dispatch(): Promise<void> {
  const plugins = await loadPlugins();
  const sessionToken = await getSessionToken();
  const headers: Record<string, string> = sessionToken ? { cookie: `session=${sessionToken}` } : {};

  const normalized = routePath.replace(/^\//, "");

  let url: string;
  let body: string | undefined;

  if (method === "GET") {
    const qs = new URLSearchParams(kvArgs).toString();
    url = `/${normalized}${qs ? `?${qs}` : ""}`;
  } else {
    url = `/${normalized}`;
    if (Object.keys(kvArgs).length > 0) {
      body = JSON.stringify(kvArgs);
      headers["content-type"] = "application/json";
    }
  }

  const mockReq = new MockRequest(url, method, headers, body);
  const mockRes = new MockResponse();
  const req = mockReq as unknown as http.IncomingMessage;
  const res = mockRes as unknown as http.ServerResponse;

  process.on("SIGINT", () => {
    mockReq.emit("close");
    setTimeout(() => process.exit(0), 200);
  });

  if (normalized === "__health") { handleHealth(req, res); return; }
  if (normalized === "__scan") { await handleScan(req, res); return; }
  if (normalized === "__ping") { await handlePing(req, res); return; }
  if (normalized === "__hosts") { await handleHosts(req, res, plugins); return; }
  if (normalized === "__map/topology") { await createMapTopologyHandler(plugins)(req, res); return; }
  if (normalized === "__check-ip") { await handleCheckIp(req, res); return; }
  if (normalized === "__oui") { await handleOui(req, res); return; }
  if (normalized === "__config/routers") { handleRouters(req, res); return; }
  if (normalized === "__config/ui") { handleUiConfig(req, res); return; }
  if (normalized.startsWith("__auth/")) { await handleAuthRoute(req, res); return; }

  if (normalized.startsWith("devices/api-proxy/")) {
    const fullUrl = `/${normalized}`;
    const matched = plugins.find((p) => p.matches(fullUrl));
    if (matched) {
      await matched.handle(req, res);
      return;
    }
    console.error(`No plugin matched: ${fullUrl}`);
    process.exit(1);
  }

  console.error(`Unknown route: ${routePath}`);
  console.error('Run "npm run api -- help" for available routes');
  process.exit(1);
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  if (!routePath || routePath === "help" || routePath === "--help" || routePath === "-h") {
    await showHelp();
    return;
  }
  await dispatch();
}

main().catch((err: Error) => {
  console.error("Error:", err.message);
  process.exit(1);
});
