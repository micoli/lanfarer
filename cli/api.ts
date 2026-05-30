#!/usr/bin/env tsx
/**
 * CLI de test local — appelle directement les fonctions internes, sans serveur HTTP.
 * Usage : npm run api -- <commande> [args]
 */

import fs from "node:fs";
import path from "node:path";

// ── Session CLI (auth web UI) ──────────────────────────────────────────────────

const SESSION_FILE = path.resolve(".cli-session");

function loadSession(): string | null {
  try { return fs.readFileSync(SESSION_FILE, "utf8").trim() || null; } catch { return null; }
}
function saveSession(token: string): void { fs.writeFileSync(SESSION_FILE, token); }
function clearSession(): void { try { fs.unlinkSync(SESSION_FILE); } catch {} }

// ── Output helpers ─────────────────────────────────────────────────────────────

function print(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

function die(msg: string): never {
  console.error(msg);
  process.exit(1);
}

// ── Auth (web UI) ──────────────────────────────────────────────────────────────

async function ensureAuth(): Promise<void> {
  const { isAuthEnabled, login, getSession: getWebSession } = await import("../server/auth.ts");
  if (!isAuthEnabled()) return;

  const token = loadSession();
  if (token && getWebSession(token)) return;

  const { parse: parseYaml } = await import("yaml");
  const { CONFIG_FILE } = await import("../server/config.ts");
  let config: Record<string, unknown> = {};
  try { config = parseYaml(fs.readFileSync(CONFIG_FILE, "utf8")) as Record<string, unknown>; } catch {}
  const cliUser = config.cli_user as string | undefined;
  const cliPass = config.cli_password as string | undefined;

  if (!cliUser || !cliPass) {
    console.warn("[auth] Auth activée mais cli_password absent de config.yaml — continuons sans session.");
    return;
  }

  const newToken = await login(cliUser, cliPass);
  if (!newToken) die("[auth] Login échoué.");
  saveSession(newToken);
  console.error(`[auth] Connecté en tant que ${cliUser}`);
}

// ── Commands ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const cmd = args[0];

function usage(): void {
  console.log(`
Usage: npm run api -- <command> [args]

Serveur:
  health                              Session bbox + target
  me                                  Utilisateur web UI connecté
  login <user> <password>             Connexion web UI
  logout                              Déconnexion web UI
  hosts                               Tous les hôtes (tous plugins)
  routers                             Routeurs configurés
  ui-config                           Configuration UI
  map                                 Topologie réseau
  scan [subnet]                       Scan réseau (CIDR, ex: 192.168.1.0/24)
  ping <ip1,ip2,...>                  Ping une fois chaque IP
  check-ip <ip>                       Ping + ARP lookup
  oui <mac>                           Vendor OUI

Bbox (routerId = nom dans config.yaml) :
  bbox <routerId> wireless
  bbox <routerId> wifi-settings
  bbox <routerId> hosts
  bbox <routerId> device
  bbox <routerId> wan/stats
  bbox <routerId> wan/graphs
  bbox <routerId> dhcp/config
  bbox <routerId> dhcp/config PUT '{...}'
  bbox <routerId> dhcp/clients
  bbox <routerId> dhcp/clients POST '{...}'
  bbox <routerId> dhcp/clients/<id> PUT '{...}'
  bbox <routerId> dhcp/clients/<id> DELETE
  bbox <routerId> dhcp/options
  bbox <routerId> dhcp/options POST '{...}'
  bbox <routerId> dhcp/options/<id> PUT '{...}'
  bbox <routerId> dhcp/options/<id> DELETE

Airport:
  airport status
  airport <routerId> hosts|wifi-settings|wireless|raw-props|device-info|acp-debug

Kuwfi:
  kuwfi status
  kuwfi <routerId> [bandwidth]

Nestwifi:
  nestwifi status
  nestwifi <routerId>

Cudy:
  cudy status
  cudy <routerId> [bandwidth]
`);
}

async function main(): Promise<void> {
  if (!cmd || cmd === "help" || cmd === "--help" || cmd === "-h") {
    usage();
    return;
  }

  // ── Auth-free commands ───────────────────────────────────────────────────────

  if (cmd === "health") {
    const { getSession } = await import("../server/session.ts");
    const { BBOX_TARGET } = await import("../server/config.ts");
    print({ ok: true, hasSession: getSession() !== null, target: BBOX_TARGET });
    return;
  }

  if (cmd === "login") {
    const user = args[1];
    const pass = args[2];
    if (!user || !pass) die("Usage: api login <username> <password>");
    const { login } = await import("../server/auth.ts");
    const token = await login(user, pass);
    if (!token) die("Login échoué.");
    saveSession(token);
    print({ ok: true, username: user });
    return;
  }

  if (cmd === "logout") {
    const token = loadSession();
    if (token) {
      const { deleteSession } = await import("../server/auth.ts");
      deleteSession(token);
    }
    clearSession();
    print({ ok: true });
    return;
  }

  // ── Authenticated commands ───────────────────────────────────────────────────

  await ensureAuth();

  if (cmd === "me") {
    const { isAuthEnabled, getSession: getWebSession } = await import("../server/auth.ts");
    if (!isAuthEnabled()) { print({ username: null, authEnabled: false }); return; }
    const token = loadSession();
    const session = token ? getWebSession(token) : null;
    if (!session) die("Non authentifié.");
    print({ username: session.username, authEnabled: true });
    return;
  }

  if (cmd === "routers") {
    const { loadAllRouters } = await import("../server/config.ts");
    print(loadAllRouters());
    return;
  }

  if (cmd === "ui-config") {
    const { loadUiConfig } = await import("../server/config.ts");
    print(loadUiConfig());
    return;
  }

  if (cmd === "oui") {
    const mac = args[1];
    if (!mac) die("Usage: api oui <mac>");
    const { lookupVendor } = await import("../server/mac-vendor.ts");
    const oui = mac.toUpperCase().replace(/[^0-9A-F]/g, "").slice(0, 6);
    if (oui.length < 6) die("MAC invalide.");
    print({ vendor: await lookupVendor(oui) });
    return;
  }

  if (cmd === "check-ip") {
    const ip = args[1];
    if (!ip) die("Usage: api check-ip <ip>");
    if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(ip)) die("IP invalide.");
    const { checkIp } = await import("../server/routes/check-ip.ts");
    print(await checkIp(ip));
    return;
  }

  if (cmd === "ping") {
    const ipsParam = args[1];
    if (!ipsParam) die("Usage: api ping <ip1,ip2,...>");
    const ips = ipsParam.split(",").map((s) => s.trim()).filter(Boolean);
    const { pingOnce } = await import("../server/routes/ping.ts");
    const results = await Promise.all(ips.map(async (ip) => ({ ip, rtt: await pingOnce(ip) })));
    print(results);
    return;
  }

  if (cmd === "scan") {
    const { runScan, detectSubnet } = await import("../server/network-scan.ts");
    const subnet = args.find((a) => a !== "scan" && !a.startsWith("-")) ?? detectSubnet();
    const ac = new AbortController();
    process.on("SIGINT", () => ac.abort());
    await runScan(subnet, (event, data) => {
      console.log(`[${event}] ${data}`);
    }, ac.signal);
    return;
  }

  if (cmd === "hosts") {
    const { loadPlugins } = await import("../server/plugins.ts");
    const { fetchAllHosts } = await import("../server/routes/hosts.ts");
    const plugins = await loadPlugins();
    print(await fetchAllHosts(plugins));
    return;
  }

  if (cmd === "map") {
    const { loadPlugins } = await import("../server/plugins.ts");
    const plugins = await loadPlugins();
    const hostnameMap = new Map<string, string>();
    const ipMap = new Map<string, string>();

    await Promise.all(plugins.map(async (p) => {
      if (p.fetchHostnames) {
        const m = await p.fetchHostnames();
        for (const [k, v] of m) hostnameMap.set(k, v);
      }
    }));
    await Promise.all(plugins.map(async (p) => {
      if (p.fetchHosts) {
        const { hosts } = await p.fetchHosts();
        for (const h of hosts) if (h.ip) ipMap.set(h.mac.toUpperCase(), h.ip);
      }
    }));

    const segments = (await Promise.all(
      plugins.filter((p) => p.fetchTopologySegments).map((p) => p.fetchTopologySegments!(hostnameMap, ipMap)),
    )).flat();
    print({ segments });
    return;
  }

  // ── Bbox ────────────────────────────────────────────────────────────────────

  if (cmd === "bbox") {
    const routerId = args[1];
    const subpath = args[2];
    const method = (args[3] ?? "GET").toUpperCase();
    const bodyArg = args[4];

    if (!routerId || !subpath) die("Usage: api bbox <routerId> <subpath> [method] [body-json]");

    const { resolveSpec, bboxCall } = await import("../plugins/bbox/server/client.ts");
    const spec = resolveSpec(routerId);
    if (!spec) die(`Routeur '${routerId}' non trouvé dans config.yaml`);

    // Named fetch helpers
    if (subpath === "wireless") {
      const { fetchBboxWireless } = await import("../plugins/bbox/server/routes/wireless.ts");
      print(await fetchBboxWireless(spec));
      return;
    }
    if (subpath === "hosts") {
      const { fetchBboxHosts } = await import("../plugins/bbox/server/routes/hosts.ts");
      print(await fetchBboxHosts(spec));
      return;
    }
    if (subpath === "device") {
      const { fetchBboxDevice } = await import("../plugins/bbox/server/routes/device.ts");
      print(await fetchBboxDevice(spec));
      return;
    }
    if (subpath === "wan/stats") {
      const { fetchBboxWan } = await import("../plugins/bbox/server/routes/wan.ts");
      print(await fetchBboxWan(spec));
      return;
    }
    if (subpath === "wan/graphs") {
      const { fetchBboxWanGraphs } = await import("../plugins/bbox/server/routes/wanGraphs.ts");
      print(await fetchBboxWanGraphs(spec));
      return;
    }
    if (subpath === "wifi-settings") {
      const { fetchBboxWifiSettings } = await import("../plugins/bbox/server/routes/wifiSettings.ts");
      print(await fetchBboxWifiSettings(spec));
      return;
    }

    // DHCP routes — dispatch via bboxCall
    const {
      extractConfig, extractClients, extractOptions, prepareDhcpClientBody,
    } = await import("../plugins/bbox/server/routes/dhcp.ts");

    if (subpath === "dhcp/config") {
      if (method === "PUT") {
        const body = bodyArg ? JSON.parse(bodyArg) as Record<string, unknown> : {};
        const r = await bboxCall(spec, "PUT", "/api/v1/dhcp", body);
        print({ statusCode: r.statusCode });
      } else {
        const r = await bboxCall(spec, "GET", "/api/v1/dhcp");
        print({ config: extractConfig(r.data) });
      }
      return;
    }
    if (subpath === "dhcp/clients") {
      if (method === "POST") {
        const body = bodyArg ? JSON.parse(bodyArg) as Record<string, unknown> : {};
        const r = await bboxCall(spec, "POST", "/api/v1/dhcp/clients", prepareDhcpClientBody(body));
        print({ statusCode: r.statusCode });
      } else {
        const r = await bboxCall(spec, "GET", "/api/v1/dhcp/clients");
        print({ clients: extractClients(r.data) });
      }
      return;
    }
    if (subpath === "dhcp/options") {
      if (method === "POST") {
        const body = bodyArg ? JSON.parse(bodyArg) as Record<string, unknown> : {};
        const r = await bboxCall(spec, "POST", "/api/v1/dhcp/option", {
          option: body.option ?? 0,
          value: body.value ?? "",
        });
        print({ statusCode: r.statusCode });
      } else {
        const r = await bboxCall(spec, "GET", "/api/v1/dhcp/options");
        print(extractOptions(r.data));
      }
      return;
    }
    const clientMatch = subpath.match(/^dhcp\/clients\/(\d+)$/);
    if (clientMatch) {
      const id = clientMatch[1];
      if (method === "DELETE") {
        const r = await bboxCall(spec, "DELETE", `/api/v1/dhcp/clients/${id}`);
        print({ statusCode: r.statusCode });
      } else {
        const body = bodyArg ? JSON.parse(bodyArg) as Record<string, unknown> : {};
        const r = await bboxCall(spec, "PUT", `/api/v1/dhcp/clients/${id}`, prepareDhcpClientBody(body));
        print({ statusCode: r.statusCode });
      }
      return;
    }
    const optMatch = subpath.match(/^dhcp\/options\/(\d+)$/);
    if (optMatch) {
      const id = optMatch[1];
      if (method === "DELETE") {
        const r = await bboxCall(spec, "DELETE", `/api/v1/dhcp/options/${id}`);
        print({ statusCode: r.statusCode });
      } else {
        const body = bodyArg ? JSON.parse(bodyArg) as Record<string, unknown> : {};
        const r = await bboxCall(spec, "PUT", `/api/v1/dhcp/options/${id}`, {
          enable: 1,
          name: body.option ?? 0,
          format: "",
          value: body.value ?? "",
        });
        print({ statusCode: r.statusCode });
      }
      return;
    }

    die(`Sous-chemin bbox inconnu : ${subpath}`);
  }

  // ── Airport ─────────────────────────────────────────────────────────────────

  if (cmd === "airport") {
    const routerOrStatus = args[1];
    if (!routerOrStatus) die("Usage: api airport status | api airport <routerId> <subpath>");

    const { loadAirportConfig, fetchAirportRouter, fetchAirportWifiSettings } =
      await import("../plugins/airport/server/fetcher.ts");
    const { fetchAcpRawProps, fetchAcpWireless } = await import("../plugins/airport/server/acp-client.ts");
    const { fetchAcpDeviceInfo, acpProbe } = await import("../plugins/airport/server/acp.ts");

    if (routerOrStatus === "status") {
      const configs = loadAirportConfig();
      print({ routers: configs.map((c) => ({ name: c.name, ip: c.ip })) });
      return;
    }

    const cfg = loadAirportConfig().find((r) => r.name === routerOrStatus);
    if (!cfg) die(`Router airport '${routerOrStatus}' non trouvé`);
    const subpath = args[2] ?? "hosts";

    if (subpath === "hosts") { print(await fetchAirportRouter(cfg)); return; }
    if (subpath === "wifi-settings") { print(await fetchAirportWifiSettings(cfg)); return; }
    if (subpath === "wireless") { print(await fetchAcpWireless(cfg.ip, cfg.password ?? "")); return; }
    if (subpath === "raw-props") { print(await fetchAcpRawProps(cfg.ip, cfg.password ?? "")); return; }
    if (subpath === "device-info") { print(await fetchAcpDeviceInfo(cfg.ip)); return; }
    if (subpath === "acp-debug") { print({ exchanges: await acpProbe(cfg.ip) }); return; }
    die(`Sous-chemin airport inconnu : ${subpath}`);
  }

  // ── Kuwfi ────────────────────────────────────────────────────────────────────

  if (cmd === "kuwfi") {
    const routerOrStatus = args[1];
    if (!routerOrStatus) die("Usage: api kuwfi status | api kuwfi <routerId> [bandwidth]");

    const { loadKuwfiConfig, fetchKuwfiRouter, fetchKuwfiBandwidth } =
      await import("../plugins/kuwfi/server/fetcher.ts");

    if (routerOrStatus === "status") {
      print({ routers: loadKuwfiConfig().map((c) => ({ name: c.name, ip: c.ip })) });
      return;
    }
    const cfg = loadKuwfiConfig().find((r) => r.name === routerOrStatus);
    if (!cfg) die(`Router kuwfi '${routerOrStatus}' non trouvé`);
    const subpath = args[2] ?? "";
    if (subpath === "bandwidth") { print(await fetchKuwfiBandwidth(cfg)); return; }
    print(await fetchKuwfiRouter(cfg));
    return;
  }

  // ── Nestwifi ─────────────────────────────────────────────────────────────────

  if (cmd === "nestwifi") {
    const routerOrStatus = args[1];
    if (!routerOrStatus) die("Usage: api nestwifi status | api nestwifi <routerId>");

    const { loadNestWifiConfig, fetchNestWifiRouter } =
      await import("../plugins/nestwifi/server/fetcher.ts");

    if (routerOrStatus === "status") {
      print({ routers: loadNestWifiConfig().map((c) => ({ name: c.name, ip: c.ip })) });
      return;
    }
    const cfg = loadNestWifiConfig().find((r) => r.name === routerOrStatus);
    if (!cfg) die(`Router nestwifi '${routerOrStatus}' non trouvé`);
    print(await fetchNestWifiRouter(cfg));
    return;
  }

  // ── Cudy ─────────────────────────────────────────────────────────────────────

  if (cmd === "cudy") {
    const routerOrStatus = args[1];
    if (!routerOrStatus) die("Usage: api cudy status | api cudy <routerId> [bandwidth]");

    const { loadCudyConfig, fetchCudyRouter, fetchCudyBandwidth } =
      await import("../plugins/cudy/server/fetcher.ts");

    if (routerOrStatus === "status") {
      print({ routers: loadCudyConfig().map((c) => ({ name: c.name, ip: c.ip })) });
      return;
    }
    const cfg = loadCudyConfig().find((r) => r.name === routerOrStatus);
    if (!cfg) die(`Router cudy '${routerOrStatus}' non trouvé`);
    const subpath = args[2] ?? "";
    if (subpath === "bandwidth") { print(await fetchCudyBandwidth(cfg)); return; }
    print(await fetchCudyRouter(cfg));
    return;
  }

  console.error(`Commande inconnue : ${cmd}`);
  usage();
  process.exit(1);
}

main().catch((err: Error) => {
  console.error("Erreur:", err.message);
  process.exit(1);
});
