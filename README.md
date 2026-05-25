# Bbox & Cudy Router GUI

A self-hosted web interface for managing a **Bouygues Bbox** router and **Cudy** Wi-Fi access points on your local network. Available as a standalone Docker container or a **Home Assistant addon**.

## Features

- **Dashboard** — real-time WAN bandwidth, uptime, and router info with configurable widgets
- **Bandwidth** — sparkline graphs for all routers (Bbox WAN down/up + Cudy Wi-Fi per band), auto-discovered from config
- **Connected hosts** — list of devices on the network with MAC/vendor lookup
- **Wi-Fi** — wireless settings and connected stations per access point
- **Hotspots** — Cudy and Bbox wireless clients grouped by access point with signal strength
- **3D network map** — Three.js visualization of access points and their connected clients
- **DHCP reservations** — view and manage static leases
- **DHCP options** — custom DHCP option management
- **Network scan** — active subnet scanner (ping + TCP fallback, ARP, mDNS, port probing)
- **Multi-router** — supports multiple Cudy APs alongside the Bbox gateway
- **Plugin system** — router backends are auto-discovered from `plugins/`
- **Configurable menu** — sidebar items and groups defined in `config.yaml`

## Architecture

```
Browser  ──►  Node.js server (server/)  ──►  plugins/bbox/server/   ──►  Bbox router API
                │                        ──►  plugins/cudy/server/   ──►  Cudy AP APIs
                │  (Vite in dev mode)
                └► React SPA (src/ + plugins/*/frontend/)
```

The Node.js server auto-discovers plugins at startup by scanning `plugins/*/server/index.ts`. Each plugin exports a `RouterPlugin` that declares which URLs it handles. The React frontend auto-discovers frontend plugins (e.g. host list providers) via `import.meta.glob` at build time.

Authentication against the Bbox router is handled transparently server-side: a session (BBOX_ID cookie + btoken) is maintained in memory and injected on every proxied request.

## Quick start

### Docker

Create a `config.yaml` (see [Configuration](#configuration) below), then:

```bash
make up   # build + start on port 3000
```

Or directly:

```bash
docker run -p 3000:5176 \
  -v $(pwd)/config.yaml:/app/config.yaml:ro \
  ghcr.io/micoli/fast5688b-gui-amd64:latest
```

### Development

```bash
npm install
# create config.yaml with your router credentials (see Configuration below)
npm run dev   # Vite HMR + server on :5176
```

## Configuration

All credentials and router settings live in `config.yaml` at the project root (never committed — already in `.gitignore`).

### `config.yaml`

```yaml
users:
  - username: admin
    passwordHash: scrypt:...   # generate with: npx tsx server/add-user.ts admin yourpassword

routers:
  - name: bbox-main
    type: bbox
    ip: 192.168.1.1            # optional: connect directly by IP instead of DNS
    password: your_bbox_password
    enabled: true

  - name: living-room-ap
    type: cudy
    ip: 192.168.1.10
    password: your_cudy_password
    enabled: true

ui:
  menu:
    - id: home
    - id: bandwidth
    - id: map
    - id: scan
    - id: hosts
      router: bbox-main
    - id: hotspots
      router: bbox-main
    - id: wifi
      router: bbox-main
    - id: dhcp
      children:
        - id: dhcp-options
          router: bbox-main
        - id: dhcp-reservations
          router: bbox-main
  home:
    widgets:
      - type: bbox-downstream
        id: bbox-main
      - type: bbox-upstream
        id: bbox-main
      - type: bbox-uptime
        id: bbox-main
      - type: bbox-firmware
        id: bbox-main
      - type: bbox-wan-graphs
        id: bbox-main
      - type: cudy-bandwidth
        id: living-room-ap
```

**Menu item ids**: `home`, `bandwidth`, `map`, `scan`, `hosts`, `hotspots`, `wifi`, `dhcp-options`, `dhcp-reservations`.
Items that require a router (`hosts`, `hotspots`, `wifi`, `dhcp-*`) must include `router: <name>`.
The `bandwidth` page auto-discovers all routers from config — no `router:` needed.
Group items (with `children`) are rendered as collapsible sections in the sidebar.
If `ui.menu` is omitted, all pages are shown in a flat list.

**Home widget types**:

| Type | `id` | Description |
|---|---|---|
| `bbox-upstream` | bbox router name | Débit montant WAN instantané |
| `bbox-downstream` | bbox router name | Débit descendant WAN instantané |
| `bbox-uptime` | bbox router name | Uptime du routeur |
| `bbox-firmware` | bbox router name | Version firmware |
| `bbox-wan-graphs` | bbox router name | Sparklines débit WAN (dernière heure) |
| `cudy-bandwidth` | cudy router name | Sparklines Wi-Fi 2.4 GHz + 5 GHz |

Generate a password hash for a GUI user:

```bash
npx tsx server/add-user.ts <username> <password>
```

### Environment variables

Only optional tunables — no credentials:

| Variable | Default | Description |
|---|---|---|
| `BBOX_TARGET` | `https://mabbox.bytel.fr` | Bbox router URL |
| `BBOX_HOST` | `mabbox.bytel.fr` | Host header sent to the router |
| `BBOX_VERBOSE` | — | Enable verbose request logging |
| `PORT` | `5176` | Server port |

Copy `.env.local.example` to `.env.local` for local overrides (never committed).

## Plugin system

Router backends are plugins in `plugins/<name>/`:

```
plugins/
  <name>/
    server/
      index.ts          # export: plugin: RouterPlugin  (required)
    frontend/
      hostListProvider.ts   # export: hostListProvider  (optional)
```

A plugin is loaded automatically if `plugins/<name>/server/index.ts` exists and exports `plugin`. No registration step needed — drop the directory and restart the server.

Frontend capabilities (e.g. providing the device list) are similarly auto-discovered via `import.meta.glob` at build time.

## Home Assistant addon

Add this repository as a custom addon repository in Home Assistant, then install **Bbox & Cudy Router GUI**.

The addon uses a pre-built image from `ghcr.io` — no build step on the HA side.

### Addon options

| Option | Default | Description |
|---|---|---|
| `bbox_target` | `https://mabbox.bytel.fr` | Bbox URL |
| `bbox_host` | `mabbox.bytel.fr` | Host header |
| `verbose` | `false` | Enable verbose logging |
| `router_config` | — | Inline YAML (same format as `config.yaml`) |

## Development commands

```bash
npm run dev      # start dev server (Vite HMR + backend)
npm run build    # TypeScript check + production build
npm run check    # Biome lint + format (auto-fix)
npm run lint     # Biome lint only
npm run format   # Biome format only
```

Docker:

```bash
make up           # production build + start (detached)
make down         # stop
make logs         # follow logs
make addon-build  # build the HA addon image locally
```

## Stack

- **Frontend**: React 19, React Router, TanStack Query, Tailwind CSS, Three.js, i18next
- **Backend**: Node.js (TypeScript via tsx), no framework
- **Tooling**: Vite, Biome, Docker

## Bbox API references

- [Domoticz-BBox plugin](https://github.com/Smanar/Domoticz-BBox/blob/master/plugin.py) — login + token flow reference
- [BBox API auto-configuration gist](https://gist.github.com/malys/85e5a2276210bea3ebb770bc71d7289a) — Node.js reference
