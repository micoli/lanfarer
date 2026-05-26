import type http from "node:http";
import type { Host, HostsData } from "../../plugins/contracts.ts";
import type { RouterPlugin } from "../plugin.ts";

function score(h: Host): number {
  return (h.hostname ? 4 : 0) + (h.ip ? 2 : 0) + (h.active ? 1 : 0);
}

function bestConnexion(
  a: Host["connexion"],
  b: Host["connexion"],
): Host["connexion"] {
  if (a === "wifi 5G" || b === "wifi 5G") return "wifi 5G";
  if (a === "wifi 2.4G" || b === "wifi 2.4G") return "wifi 2.4G";
  return a ?? b;
}

function merge(a: Host, b: Host): Host {
  return {
    mac: a.mac,
    ip: a.ip || b.ip,
    ip6: a.ip6 || b.ip6,
    hostname: a.hostname || b.hostname,
    active: a.active || b.active,
    type: a.type || b.type,
    connexion: bestConnexion(a.connexion, b.connexion),
    ssid: a.ssid || b.ssid,
    lastseen: a.lastseen ?? b.lastseen,
  };
}

export async function handleHosts(
  _req: http.IncomingMessage,
  res: http.ServerResponse,
  plugins: RouterPlugin[],
): Promise<void> {
  const results = await Promise.allSettled(
    plugins.filter((p) => p.fetchHosts).map((p) => p.fetchHosts!()),
  );

  const byMac = new Map<string, Host>();

  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    for (const host of result.value.hosts) {
      const key = host.mac.toUpperCase();
      const existing = byMac.get(key);
      if (!existing) {
        byMac.set(key, host);
      } else {
        byMac.set(key, score(host) >= score(existing) ? merge(host, existing) : merge(existing, host));
      }
    }
  }

  const body = JSON.stringify({ hosts: [...byMac.values()] } satisfies HostsData);
  res.writeHead(200, { "content-type": "application/json", "content-length": Buffer.byteLength(body) });
  res.end(body);
}
