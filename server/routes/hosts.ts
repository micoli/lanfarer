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

function sseWrite(res: http.ServerResponse, event: string, data: unknown) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export async function fetchAllHosts(plugins: RouterPlugin[]): Promise<HostsData> {
  const hostsPlugins = plugins.filter((p) => p.fetchHosts);
  const byMac = new Map<string, Host>();

  await Promise.allSettled(
    hostsPlugins.map(async (p) => {
      const { hosts } = await p.fetchHosts!();
      for (const host of hosts) {
        const key = host.mac.toUpperCase();
        const existing = byMac.get(key);
        if (!existing) {
          byMac.set(key, host);
        } else {
          byMac.set(
            key,
            score(host) >= score(existing) ? merge(host, existing) : merge(existing, host),
          );
        }
      }
    }),
  );

  return { hosts: [...byMac.values()] };
}

export async function handleHosts(
  _req: http.IncomingMessage,
  res: http.ServerResponse,
  plugins: RouterPlugin[],
): Promise<void> {
  const hostsPlugins = plugins.filter((p) => p.fetchHosts);

  res.writeHead(200, {
    "content-type": "text/event-stream",
    "cache-control": "no-cache",
    "connection": "keep-alive",
    "x-accel-buffering": "no",
  });

  const total = hostsPlugins.length;
  if (total === 0) {
    sseWrite(res, "result", { hosts: [] } satisfies HostsData);
    res.end();
    return;
  }

  const byMac = new Map<string, Host>();
  let done = 0;

  sseWrite(res, "progress", { pct: 0, label: hostsPlugins.map((p) => p.type).join(", ") });

  await Promise.allSettled(
    hostsPlugins.map(async (p) => {
      try {
        const { hosts } = await p.fetchHosts!();
        for (const host of hosts) {
          const key = host.mac.toUpperCase();
          const existing = byMac.get(key);
          if (!existing) {
            byMac.set(key, host);
          } else {
            byMac.set(
              key,
              score(host) >= score(existing) ? merge(host, existing) : merge(existing, host),
            );
          }
        }
      } finally {
        done++;
        sseWrite(res, "progress", {
          pct: Math.round((done / total) * 95),
          label: p.type,
        });
      }
    }),
  );

  sseWrite(res, "result", { hosts: [...byMac.values()] } satisfies HostsData);
  res.end();
}
