---
type: concept
updated: 2026-08-16
tags: [paths, map, citizens]
---

# Where files live

Plain map for citizens of the Kingdom. All paths are on this Mac unless noted.

## Command center

| What | Path |
|------|------|
| Kingdom panel | |
| Brain (this wiki) | |
| Synced panel data | |
| Audits copy | |
| Sync command | inside Kingdom |

## WhatsApp / Voice (Agent Cash)

**Root:** 

| Folder / file | Purpose |
|---------------|---------|
| STATUS.md | Version · progress · next tasks |
| CONTEXT.md | Frozen product bets |
| | Phase gates |
| `demo/`, `outreach/`, `offers/`, `ops/` | Demo, brokers, sales, WABA |

## Procedural City (Agent Metro)

**Root:** `~/ProceduralCity` 
**Remote:** `https://github.com/navinash47/ProceduralCity.git`

| Fact | Detail |
|------|--------|
| Truth for Kingdom | Prefer **** when local branch is behind |
| Local trap | Checkout stuck on phase26 looked like “26% done” - cloud is ~Phase 48–49 |
| Refresh | `git fetch origin && git checkout main && git pull` |

## ComicMainEngine (Agent Ink)

**Root:** 

| Do use | Do **not** confuse with |
|--------|-------------------------|
| | `~/ComicEngine` (legacy stub / old notes) |

| File | Purpose |
|------|---------|
| | **Kingdom progress for 2A** (A0–A5). Live UI `/v2a` on `:8770` |
| | Storyboard-first architecture |
| | Version 2 (phases 12–20) - **frozen** while 2A runs |
| | V1 task board + api_call spend (historical) |

Dashboard: `python scripts/run_dashboard.py` to http://127.0.0.1:8770/v2a

## Other provinces

| Venture | Path |
|---------|------|
| YouTube editor | (SRS:) |
| Research Frontier | |
| BeamDojo | (STATUS.md,, gitignored, `proofs/*.mp4`). Live metrics: W&B project beamdojo. |
| Job Jugaad | (tracker UI + API `:8790`,) |
| Mac optimize audit | (live dashboard `:8742`,) |
| Subscription audit | |
| Mac storage audit (legacy) | |

## Skills backup

| Live | Versioned |
|------|-----------|
| | + |

Restore: from Kingdom.

## Meta tooling (cloned)

| Tool | Path |
|------|------|
| Task Observer upstream | |
| Headroom upstream | |
| Observation log | |
| Task Observer skill (personal) | |
| Task Observer skill (project) | |
| Headroom CLI | |
| Headroom runbook | |
| Headroom MCP | to server headroom |

## Cloudflare public links

```bash
cd ~/Projects/avinashs-kingdom
npm run dashboards # start all locals
npm run dashboards:status
npm run dashboards:stop
npm run tunnels:list # ports + start hints
npm run tunnels # public URLs for every dashboard that is UP
```

Chat: **start dashboards** · **cloudflare links** 
URLs file:.
