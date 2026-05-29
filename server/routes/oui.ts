import type http from "node:http";

// OUI prefix (first 3 bytes, uppercase no separator) → vendor name
const cache = new Map<string, string | null>();

function ouiPrefix(mac: string): string {
  return mac.toUpperCase().replace(/[^0-9A-F]/g, "").slice(0, 6);
}

function sendJson(res: http.ServerResponse, code: number, data: unknown) {
  const body = JSON.stringify(data);
  res.writeHead(code, { "content-type": "application/json", "content-length": Buffer.byteLength(body) });
  res.end(body);
}

async function lookupVendor(oui: string): Promise<string | null> {
  if (cache.has(oui)) return cache.get(oui)!;
  try {
    const mac = `${oui.slice(0, 2)}:${oui.slice(2, 4)}:${oui.slice(4, 6)}`;
    const res = await fetch(`https://api.macvendors.com/${mac}`, {
      headers: { Accept: "text/plain" },
      signal: AbortSignal.timeout(3000),
    });
    if (res.status === 404) { cache.set(oui, null); return null; }
    if (!res.ok) return null;
    const vendor = (await res.text()).trim() || null;
    cache.set(oui, vendor);
    return vendor;
  } catch {
    return null;
  }
}

export async function handleOui(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const url = new URL(req.url ?? "/", "http://localhost");
  const mac = url.searchParams.get("mac");
  if (!mac) { sendJson(res, 400, { error: "mac param required" }); return; }
  const oui = ouiPrefix(mac);
  if (oui.length < 6) { sendJson(res, 400, { error: "invalid mac" }); return; }
  const vendor = await lookupVendor(oui);
  sendJson(res, 200, { vendor });
}
