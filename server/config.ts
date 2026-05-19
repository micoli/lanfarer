import fs from "node:fs";

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

loadEnvLocal();

export const BBOX_TARGET   = process.env.BBOX_TARGET   ?? "https://mabbox.bytel.fr";
export const BBOX_HOST     = process.env.BBOX_HOST     ?? "mabbox.bytel.fr";
export const BBOX_PASSWORD = process.env.BBOX_PASSWORD ?? "";
export const PORT          = parseInt(process.env.PORT ?? "5176", 10);
export const isDev         = process.env.NODE_ENV !== "production";
export const VERBOSE       = !!process.env.BBOX_VERBOSE;

export const targetUrl = new URL(BBOX_TARGET);
export const isHttps   = targetUrl.protocol === "https:";
