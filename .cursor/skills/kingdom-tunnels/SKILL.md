---
name: kingdom-tunnels
description: >-
  Start local Kingdom dashboards and/or generate Cloudflare trycloudflare.com
  public links (Kingdom, Procedural City, ComicMainEngine, WhatsApp demo, subs,
  Mac report). Use when the user says start dashboards, start all dashboards,
  cloudflare links, tunnel dashboards, share dashboard URL, or public link for
  kingdom/city/comic.
---

# Kingdom dashboards + Cloudflare tunnels

## Chat phrases

- `start dashboards` / `start all dashboards` → start locals
- `stop dashboards` → stop locals started by the script
- `dashboard status` → which ports are UP
- `cloudflare links` / `tunnel dashboards` → **always start locals first**, then public URLs

## Start locals

```bash
cd /Users/avinashnandyala/Projects/avinashs-kingdom
./scripts/start-dashboards.sh              # all
./scripts/start-dashboards.sh kingdom city # subset
./scripts/start-dashboards.sh --status
./scripts/start-dashboards.sh --stop
npm run dashboards
```

## Cloudflare public links

`cloudflare-dashboards.sh` **auto-starts** dashboards, then opens detached quick tunnels. Do **not** skip start unless the user says so.

```bash
cd /Users/avinashnandyala/Projects/avinashs-kingdom
./scripts/cloudflare-dashboards.sh              # start all + tunnel all
./scripts/cloudflare-dashboards.sh kingdom city # subset
./scripts/cloudflare-dashboards.sh --list
./scripts/cloudflare-dashboards.sh --no-start   # tunnel only (rare)
npm run tunnels
```

When the user wants a **friend to see the full orchestrator** (one link, embedded demos, read-only guest view):

```bash
npm run share
```

This starts all venture dashboards locally, syncs data, tunnels **only kingdom (:5173)**, and writes `public/data/share-url.json` for the copy-link banner.

Friend URL shows read-only UI; host runs Start/Sync locally — guest view polls status every ~12s.

Requires `cloudflared` (`brew install cloudflare/cloudflare/cloudflared`).

## Port map

| Name | Port | Notes |
|------|------|--------|
| kingdom | 5173 | Vite panel |
| city | 8765 | Procedural City HTML dashboard |
| comic | 8770 | ComicMainEngine (not 8765 — avoids City clash) |
| whatsapp | 8787 | demo server (`/health`) |
| jugaad | 8790 | Job Jugaad applications tracker |
| subs | 8741 | subscription-audit |
| mac | 8742 | mac-optimize-audit live dashboard |

## Agent steps

1. If user asked to **start** → run `start-dashboards.sh`, report local URLs.
2. If user asked for **cloudflare links** → run **only** `./scripts/cloudflare-dashboards.sh` (or `npm run tunnels`) with full permissions (`all`). It:
   - starts every dashboard (detached new session)
   - opens each tunnel detached (survives shell teardown)
   - waits for DNS via **DoH** (never early system-DNS probe — that NXDOMAIN-poisons ~30m)
   - backs off on Cloudflare **429 / error 1015**
   - writes/shows `brain/wiki/ops/cloudflare-links.md`
   - Never ask the user to start dashboards first.
3. Comic must use port **8770**.
4. Quick tunnels are temporary; re-run for new links.
5. If links return Error 1033 → tunnels died (need detached spawn).
6. If creates fail with **429** → stop hammering; wait 10–30+ minutes, then one `npm run tunnels`. Do not tight-loop probes (extends the ban).
