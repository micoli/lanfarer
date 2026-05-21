# Bbox & Cudy Router GUI

A self-hosted web interface for managing a **Bouygues Bbox** router and **Cudy** Wi-Fi access points on your local network. Available as a standalone Docker container or a **Home Assistant addon**.

## Features

- **Dashboard** — real-time WAN bandwidth, uptime, and router info
- **Connected hosts** — list of devices on the network with MAC/vendor lookup
- **Wi-Fi** — wireless settings and connected stations per access point
- **Hotspots** — Cudy and Bbox wireless clients grouped by access point with signal strength
- **3D network map** — Three.js visualization of access points and their connected clients
- **DHCP reservations** — view and manage static leases
- **DHCP options** — custom DHCP option management
- **Network scan** — active subnet scanner (ping + TCP fallback, ARP, mDNS, port probing)
- **Multi-router** — supports multiple Cudy APs alongside the Bbox gateway

## Architecture

```
Browser  ──►  Node.js server (server/)  ──►  Bbox router API
                │                        ──►  Cudy AP APIs
                │  (Vite in dev mode)
                └► React SPA (src/)
```

The Node.js server handles authentication against the Bbox router transparently: it maintains a session (BBOX_ID cookie + btoken) and injects credentials on every proxied request. The React frontend never touches credentials directly.

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
  - name: bbox
    type: bbox
    ip: 192.168.1.1            # optional: connect directly by IP instead of DNS
    password: your_bbox_password
    enabled: true

  - name: living-room-ap
    type: cudy
    ip: 192.168.1.10
    password: your_cudy_password
    enabled: true
```

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
- **Backend**: Node.js (TypeScript, `--experimental-strip-types`), no framework
- **Tooling**: Vite, Biome, Docker

## Bbox API references

- [Domoticz-BBox plugin](https://github.com/Smanar/Domoticz-BBox/blob/master/plugin.py) — login + token flow reference
- [BBox API auto-configuration gist](https://gist.github.com/malys/85e5a2276210bea3ebb770bc71d7289a) — Node.js reference
