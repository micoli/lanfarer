import crypto from "node:crypto";
import fs from "node:fs";
import type http from "node:http";
import os from "node:os";
import path from "node:path";
import { HA_CONFIG } from "../config.ts";

const CACHE_TTL_MS = 5 * 60 * 1000;

function cacheGet(url: string): unknown | null {
  const key = crypto.createHash("md5").update(url).digest("hex");
  const file = path.join(os.tmpdir(), `lanfarer-ha-${key}.json`);
  try {
    const raw = fs.readFileSync(file, "utf8");
    const { ts, data } = JSON.parse(raw) as { ts: number; data: unknown };
    if (Date.now() - ts < CACHE_TTL_MS) return data;
  } catch { /* miss */ }
  return null;
}

function cacheSet(url: string, data: unknown): void {
  const key = crypto.createHash("md5").update(url).digest("hex");
  const file = path.join(os.tmpdir(), `lanfarer-ha-${key}.json`);
  try {
    fs.writeFileSync(file, JSON.stringify({ ts: Date.now(), data }));
  } catch { /* ignore */ }
}

async function haFetch(url: string, token: string): Promise<unknown> {
  const cached = cacheGet(url);
  if (cached !== null) return cached;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  cacheSet(url, data);
  return data;
}

interface HaState {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
}

function normalizeMac(mac: string): string {
  return mac.toLowerCase().replace(/[^0-9a-f]/g, "");
}

async function findEntityForMac(haUrl: string, token: string, mac: string): Promise<string | null> {
  const normalized = normalizeMac(mac);
  const statesUrl = `${haUrl}/api/states`;
  let states: HaState[];
  try {
    states = (await haFetch(statesUrl, token)) as HaState[];
  } catch {
    return null;
  }
  const trackers = states.filter((s) => s.entity_id.startsWith("device_tracker."));
  for (const s of trackers) {
    const attrs = s.attributes;
    const rawMac =
      (attrs.mac as string | undefined) ??
      (attrs.mac_address as string | undefined) ??
      (attrs.source_mac as string | undefined);
    if (rawMac && normalizeMac(rawMac) === normalized) return s.entity_id;
    // Fallback: entity_id slug may itself be a 12-char hex MAC
    const slug = s.entity_id.slice("device_tracker.".length);
    if (/^[0-9a-f]{12}$/i.test(slug) && slug.toLowerCase() === normalized) return s.entity_id;
  }
  return null;
}

async function fetchHistory(
  haUrl: string,
  token: string,
  entityId: string,
  days: number,
): Promise<{ state: string; ts: number }[]> {
  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  const startIso = start.toISOString();
  const endIso = end.toISOString();
  const url = `${haUrl}/api/history/period/${encodeURIComponent(startIso)}?filter_entity_id=${encodeURIComponent(entityId)}&end_time=${encodeURIComponent(endIso)}&minimal_response`;
  let data: HaState[][];
  try {
    data = (await haFetch(url, token)) as HaState[][];
  } catch {
    return [];
  }
  const series = data[0] ?? [];
  return series.map((s) => ({
    state: s.state,
    ts: Math.floor(new Date(s.last_changed).getTime() / 1000),
  }));
}

export async function handleHaHistory(
  req: http.IncomingMessage & { url: string },
  res: http.ServerResponse,
): Promise<void> {
  if (!HA_CONFIG) {
    res.writeHead(503, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "Home Assistant not configured" }));
    return;
  }

  const url = new URL(req.url, "http://localhost");
  const mac = url.searchParams.get("mac");
  const days = Math.min(31, Math.max(1, parseInt(url.searchParams.get("days") ?? "3", 10)));

  if (!mac) {
    res.writeHead(400, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "mac required" }));
    return;
  }

  try {
    const entityId = await findEntityForMac(HA_CONFIG.url, HA_CONFIG.token, mac);
    if (!entityId) {
      const payload = JSON.stringify({ entityId: null, history: [] });
      res.writeHead(200, { "content-type": "application/json", "content-length": Buffer.byteLength(payload) });
      res.end(payload);
      return;
    }
    const history = await fetchHistory(HA_CONFIG.url, HA_CONFIG.token, entityId, days);
    const payload = JSON.stringify({ entityId, history });
    res.writeHead(200, { "content-type": "application/json", "content-length": Buffer.byteLength(payload) });
    res.end(payload);
  } catch (err) {
    console.error("[ha-history] error:", err);
    res.writeHead(502, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to reach Home Assistant" }));
  }
}
