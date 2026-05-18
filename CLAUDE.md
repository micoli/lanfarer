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
npm run dev        # Start the Node.js server (Vite HMR + Bbox proxy)
npm run serve      # Production mode (serves dist/ + Bbox proxy)
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

No test suite exists in this project.

## Environment

`.env.local` (not committed, auto-loaded by the server) must define:
- `BBOX_PASSWORD` — admin password for the Bbox router (required; server logs in on startup)
- `BBOX_TARGET` — optional, proxy target (default: `https://mabbox.bytel.fr`)
- `BBOX_HOST` — optional, Host header sent to router (default: `mabbox.bytel.fr`)
- `BBOX_VERBOSE` — optional, enables verbose proxy logging

Actual environment variables take precedence over `.env.local`.

## Architecture

### Server (`server.ts`)

A standalone Node.js server that replaces both the Vite dev server and nginx in production:
- Maintains a Bbox session (BBOX_ID + btoken) in memory using `BBOX_PASSWORD`
- Auto-logs in on startup, re-authenticates transparently on 401/403
- Proxies `/bbox-api/*` to the Bbox router with cookies injected server-side
- Appends `?btoken=...` automatically on POST/PUT/DELETE (CSRF requirement)
- In dev mode: integrates Vite via its JS API (`createServer` with `middlewareMode: true`) for HMR
- In production: serves `dist/` as static files with SPA fallback
- Health endpoint: `GET /__health` → `{ ok, hasSession, target }`

### Bbox API Layer (`src/lib/bbox/`)

Two-layer design:
- **`client.ts`** — plain fetch wrappers (`bboxFetch`, `bboxPost`, `bboxPut`, `bboxDelete`). No token management — the server handles auth transparently.
- **`api.ts`** — `bboxApi` object with typed methods. All Bbox endpoints go here.

### Data Fetching (`src/hooks/useBbox.ts`)

All server state goes through TanStack Query hooks. No components call `bboxApi` directly.

Query key conventions:
- `['dhcp']` — DHCP config
- `['dhcp', 'clients']` — static DHCP reservations
- `['dhcp', 'options']` — DHCP options
- `['hosts']` — connected devices
- `['device']` — router device info
- `['wan', 'stats']` — WAN traffic stats
- `['wireless']` — Wi-Fi settings

### Routing (`src/App.tsx`)

Uses **`HashRouter`** so the app works when served as static files without server-side routing. All routes are nested under `Layout` directly (no auth guard — authentication is server-side).

### Formatting

Biome is the formatter/linter (not ESLint/Prettier). Config: 2-space indent, double quotes, trailing commas (ES5), 100-char line width. Run `npm run check` to auto-fix before committing.

## Bbox API References

- **Auth flow**: `POST /api/v1/login` → BBOX_ID cookie, then `GET /api/v1/device/token` → `json[0].device.token` (the btoken). btoken is server-issued, not client-generated.
- [Domoticz-BBox plugin (Python)](https://github.com/Smanar/Domoticz-BBox/blob/master/plugin.py) — reference implementation of login + token fetch
- [BBox API router auto configuration (Node.js gist)](https://gist.github.com/malys/85e5a2276210bea3ebb770bc71d7289a)
