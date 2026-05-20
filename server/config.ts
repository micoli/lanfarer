import fs from "node:fs";
import { parse as parseYaml } from "yaml";

export function loadEnvLocal(): void {
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

interface BboxRouter {
  type?: string;
  ip?: string;
  password?: string;
  enabled?: boolean;
}

function loadBboxFromConfig(): BboxRouter {
  try {
    const raw = fs.readFileSync(process.env.CUDY_CONFIG ?? "config.yaml", "utf8");
    const data = parseYaml(raw) as { routers?: BboxRouter[] };
    return (data.routers ?? []).find((r) => r.type === "bbox" && r.enabled !== false) ?? {};
  } catch {
    return {};
  }
}

const bboxFromConfig = loadBboxFromConfig();

function loadBboxPasswordFromConfig(): string {
  return bboxFromConfig.password ?? "";
}

function loadBboxTargetFromConfig(): string {
  return "https://mabbox.bytel.fr";
}

loadEnvLocal();

export const CONFIG_FILE   = process.env.CUDY_CONFIG   ?? "config.yaml";
export const SESSIONS_FILE = process.env.SESSIONS_FILE ?? "sessions.json";
export const BBOX_TARGET   = process.env.BBOX_TARGET   ?? loadBboxTargetFromConfig();
export const BBOX_HOST     = process.env.BBOX_HOST     ?? "mabbox.bytel.fr";
export const BBOX_PASSWORD = process.env.BBOX_PASSWORD ?? loadBboxPasswordFromConfig();
export const PORT          = parseInt(process.env.PORT ?? "5176", 10);
export const BASE_PATH     = process.env.BASE_PATH ?? "";
export const isDev         = process.env.NODE_ENV !== "production";
export const VERBOSE       = !!process.env.BBOX_VERBOSE;

export const targetUrl        = new URL(BBOX_TARGET);
export const isHttps          = targetUrl.protocol === "https:";
// When a bbox IP is available in config, connect directly to it (bypasses DNS).
// BBOX_HOST is still used as Host header and TLS SNI so the Bbox accepts the request.
export const BBOX_OVERRIDE_IP = bboxFromConfig.ip ?? null;
export const BBOX_CONNECT_HOST = BBOX_OVERRIDE_IP ?? targetUrl.hostname;
