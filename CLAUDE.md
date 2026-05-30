# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## RTK (Rust Token Killer)

Shell commands are automatically proxied through `rtk` via a Claude Code hook — no manual prefix needed. Use these meta-commands directly:

```bash
rtk gain            # Token savings analytics for this session
rtk gain --history  # Command history with per-command savings
rtk discover        # Scan Claude Code history for missed RTK opportunities
rtk proxy <cmd>     # Run a command bypassing RTK filtering (debug)
```

## Commands

```bash
npm run dev        # Start the Node.js server (Vite HMR + router proxies)
npm run serve      # Production mode (serves dist/ + router proxies)
npm run build      # TypeScript check + Vite build
npm run check      # Biome lint + format (write fixes)
npm run lint       # Biome lint only (write fixes)
npm run format     # Biome format only (write fixes)
```

Docker (via Makefile):
```bash
make up       # production build + start detached
make down     # stop containers
make logs     # follow logs
```

No test suite exists in this project. **For local API testing, use the CLI** (`cli/api.ts`) — see the Local API CLI section below.

## Environment

Router credentials are configured in `config.yaml` (not committed). Optional env overrides in `.env.local` (not committed):
- `BBOX_TARGET` — proxy target (default: `https://mabbox.bytel.fr`)
- `BBOX_HOST` — Host header sent to router (default: `mabbox.bytel.fr`)
- `BBOX_VERBOSE` — enables verbose proxy logging

## Architecture

### Server (`server/index.ts`)

A standalone Node.js server that replaces both the Vite dev server and nginx in production:
- Scans `plugins/*/server/index.ts` at startup and loads them dynamically (auto-discovery)
- Proxies authenticated requests to router plugins
- Appends `?btoken=...` automatically on POST/PUT/DELETE (Bbox CSRF requirement)
- In dev mode: integrates Vite via its JS API (`createServer` with `middlewareMode: true`) for HMR
- In production: serves `dist/` as static files with SPA fallback
- Health endpoint: `GET /__health` → `{ ok, hasSession, target }`
- Router list: `GET /__config/routers` → `[{ name, type }]` — all enabled routers from config.yaml
- UI config: `GET /__config/ui` → menu and widget configuration

### Plugin system (`plugins/`)

Each plugin lives in `plugins/<name>/` with two sub-trees:

```
plugins/
  <name>/
    server/
      index.ts       # must export: plugin: RouterPlugin
    frontend/
      hostListProvider.ts   # optional — export: hostListProvider: HostListProvider
```

**Server contract** (`server/plugin.ts`):
```ts
interface RouterPlugin {
  readonly type: string;
  matches(url: string): boolean;
  handle(req, res): Promise<void>;
}
```

**Frontend auto-discovery**: `plugins/hostListProviders.ts` uses `import.meta.glob` to collect all `hostListProvider` exports at build time — no manual registration needed.

Current plugins: `bbox` (Bbox router proxy + DHCP/Wi-Fi/graphs API), `cudy` (Cudy AP LuCI clients + bandwidth), `airport` (Apple AirPort Extreme via ARP table), `kuwfi` (KuWFi CPE outdoor APs — proprietary CGI auth).

### Bbox API layer (`plugins/bbox/frontend/`)

- **`api/bbox.ts`** — `bboxApi` object with typed methods. All Bbox endpoints go here.
- **`hooks/useBbox.ts`** — TanStack Query hooks. No components call `bboxApi` directly.

Query key conventions:
- `['dhcp', routerId, 'config']` — DHCP config
- `['dhcp', routerId, 'clients']` — static DHCP reservations
- `['dhcp', routerId, 'options']` — DHCP options
- `['hosts', routerId]` — connected devices
- `['device', routerId]` — router device info
- `['wan', 'stats', routerId]` — WAN traffic stats instantanées
- `['wan', 'graphs', routerId]` — historique débit WAN (dernière heure, kbps)
- `['wireless', routerId]` — Wi-Fi settings
- `['cudy', 'bandwidth', routerId]` — débit Wi-Fi Cudy par interface (kbps, dérivé des volumes cumulatifs)
- `['kuwfi', 'router', routerId]` — données complètes d'un AP KuWFi (accessPoints + clients)
- `['kuwfi', 'hosts', routerId]` — liste d'hôtes KuWFi
- `['config', 'routers']` — liste de tous les routeurs configurés

### Routing (`src/App.tsx`)

Uses **`HashRouter`** so the app works when served as static files without server-side routing. All routes are nested under `Layout` directly (no auth guard — authentication is server-side).

### UI configuration (`config.yaml` → `ui:`)

The `ui.menu` key controls the sidebar. Items can be nested with `children` to create collapsible groups:

```yaml
ui:
  menu:
    - id: home
    - id: dhcp
      children:
        - id: dhcp-options
          router: bbox-main
        - id: dhcp-reservations
          router: bbox-main
```

Valid leaf ids: `home`, `map`, `hosts`, `hotspots`, `scan`, `wifi`, `dhcp-options`, `dhcp-reservations`.
Leaf items that require a router (dhcp-*, hosts, hotspots, wifi) must include `router: <name>`.

### Formatting

Biome is the formatter/linter (not ESLint/Prettier). Config: 2-space indent, double quotes, trailing commas (ES5), 100-char line width. Run `npm run check` to auto-fix before committing.

## Local API CLI

`cli/api.ts` — CLI auto-authentifié pour tester toutes les routes localement.

```bash
npm run api -- help                          # liste des commandes

# Routes serveur
npm run api -- health                        # GET /__health
npm run api -- hosts                         # GET /__hosts
npm run api -- routers                       # GET /__config/routers
npm run api -- ui-config                     # GET /__config/ui
npm run api -- map                           # GET /__map/topology
npm run api -- scan [subnet]                 # GET /__scan (SSE)
npm run api -- ping 192.168.1.1,192.168.1.2 # GET /__ping (SSE)
npm run api -- check-ip 192.168.1.1         # GET /__check-ip
npm run api -- oui aa:bb:cc:dd:ee:ff        # GET /__oui

# Plugins bbox
npm run api -- bbox bbox-main hosts
npm run api -- bbox bbox-main device
npm run api -- bbox bbox-main wan/stats
npm run api -- bbox bbox-main dhcp/clients
npm run api -- bbox bbox-main dhcp/config PUT '{"body":...}'

# Plugins airport / kuwfi / nestwifi
npm run api -- airport status
npm run api -- airport ap-name hosts
npm run api -- kuwfi status

# Requête brute
npm run api -- raw /devices/api-proxy/bbox-proxy/bbox-main/dhcp/clients POST '{"ip":"..."}'
```

**Pas de serveur requis** : le CLI appelle directement les fonctions internes (imports TypeScript), sans HTTP vers localhost.

**Auth** : si `users:` est configuré dans `config.yaml`, ajouter `cli_password: <mot-de-passe>` (+ `cli_user:` si nécessaire). La session est mise en cache dans `.cli-session`.

## Bbox API References

- **Auth flow**: `POST /api/v1/login` → BBOX_ID cookie, then `GET /api/v1/device/token` → `json[0].device.token` (the btoken). btoken is server-issued, not client-generated.
- [Domoticz-BBox plugin (Python)](https://github.com/Smanar/Domoticz-BBox/blob/master/plugin.py) — reference implementation of login + token fetch
- [BBox API router auto configuration (Node.js gist)](https://gist.github.com/malys/85e5a2276210bea3ebb770bc71d7289a)
