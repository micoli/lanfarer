import fs from "node:fs";

const MAC_VENDOR_CACHE = "/tmp/fast5688b-mac-vendor-cache.json";
const MAC_VENDOR_TTL   = 24 * 60 * 60 * 1000;

interface MacEntry { macPrefix: string; vendorName: string }
let vendorMap    = new Map<string, string>();
let vendorLoadedAt = 0;

export function normaliseOui(mac: string): string {
  return mac.replace(/[:\-.]/g, "").toUpperCase().slice(0, 6);
}

function buildVendorMap(entries: MacEntry[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const e of entries) m.set(normaliseOui(e.macPrefix), e.vendorName);
  return m;
}

export async function loadVendorDb(): Promise<void> {
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

export function lookupVendor(mac: string): string {
  return vendorMap.get(normaliseOui(mac)) ?? "";
}
