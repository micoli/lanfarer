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
  name?: string;
  type?: string;
  ip?: string;
  password?: string;
  enabled?: boolean;
}

export interface BboxRouterSpec {
  name: string;
  password: string;
  host: string;
  connectHost: string;
  targetUrl: URL;
  isHttps: boolean;
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

export function loadBboxRouterByName(name: string): BboxRouterSpec | null {
  try {
    const raw = fs.readFileSync(CONFIG_FILE, "utf8");
    const data = parseYaml(raw) as { routers?: BboxRouter[] };
    const r = (data.routers ?? []).find(
      (router) => router.type === "bbox" && router.name === name && router.enabled !== false,
    );
    if (!r?.password) return null;
    // Use the same host/target constants as the rest of the server (env var overridable)
    const target = targetUrl;
    const connectHost = r.ip ?? target.hostname;
    return { name, password: r.password, host: BBOX_HOST, connectHost, targetUrl: target, isHttps };
  } catch {
    return null;
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
export const BBOX_PASSWORD = loadBboxPasswordFromConfig();
export const PORT          = parseInt(process.env.PORT ?? "5176", 10);
export const BASE_PATH     = process.env.BASE_PATH ?? "";
export const isDev         = process.env.NODE_ENV !== "production";
export const VERBOSE       = !!process.env.BBOX_VERBOSE;
export const AUTH_DISABLED = !!process.env.AUTH_DISABLED;

export const targetUrl        = new URL(BBOX_TARGET);
export const isHttps          = targetUrl.protocol === "https:";
// When a bbox IP is available in config, connect directly to it (bypasses DNS).
// BBOX_HOST is still used as Host header and TLS SNI so the Bbox accepts the request.
export const BBOX_OVERRIDE_IP = bboxFromConfig.ip ?? null;
export const BBOX_CONNECT_HOST = BBOX_OVERRIDE_IP ?? targetUrl.hostname;

interface UiMenuItemConfig { id: string; router?: string; children?: UiMenuItemConfig[] }
interface UiWidgetConfig   { type: string; id: string }
export interface UiConfig {
  menu: UiMenuItemConfig[] | null;
  home: { widgets: UiWidgetConfig[] } | null;
  dhcp: { router: string } | null;
}

export interface RouterEntry {
  name: string;
  type: string;
}

export function loadAllRouters(): RouterEntry[] {
  try {
    const raw = fs.readFileSync(CONFIG_FILE, "utf8");
    const data = parseYaml(raw) as { routers?: { name?: string; type?: string; enabled?: boolean }[] };
    return (data.routers ?? [])
      .filter((r) => r.enabled !== false && r.name && r.type)
      .map((r) => ({ name: r.name!, type: r.type! }));
  } catch {
    return [];
  }
}

function buildDefaultUiConfig(): UiConfig {
  const routers = loadAllRouters();
  const firstBbox = routers.find((r) => r.type === "bbox");
  const menu: UiMenuItemConfig[] = [
    { id: "home" },
    { id: "bandwidth" },
    { id: "scan" },
    { id: "hotspots" },
    { id: "map" },
  ];
  if (firstBbox) {
    menu.push({ id: "hosts", router: firstBbox.name });
    menu.push({ id: "wifi", router: firstBbox.name });
    menu.push({ id: "dhcp-options", router: firstBbox.name });
    menu.push({ id: "dhcp-reservations", router: firstBbox.name });
  }
  return { menu, home: null, dhcp: firstBbox ? { router: firstBbox.name } : null };
}

export function loadUiConfig(): UiConfig {
  try {
    const raw = fs.readFileSync(CONFIG_FILE, "utf8");
    const data = parseYaml(raw) as {
      ui?: { menu?: UiMenuItemConfig[]; home?: { widgets?: UiWidgetConfig[] } };
      dhcp?: { router?: string };
    };
    const ui = data.ui;
    const dhcp = data.dhcp?.router ? { router: data.dhcp.router } : null;
    if (!ui) return { ...buildDefaultUiConfig(), dhcp };
    return {
      menu: ui.menu ?? null,
      home: ui.home?.widgets ? { widgets: ui.home.widgets } : null,
      dhcp,
    };
  } catch {
    return buildDefaultUiConfig();
  }
}
