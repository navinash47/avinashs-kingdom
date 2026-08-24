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
| Kingdom panel | `~/Projects/avinashs-kingdom` |
| Brain (this wiki) | `~/Projects/avinashs-kingdom/brain` |
| Synced panel data | `~/Projects/avinashs-kingdom/public/data/` |
| Audits copy | `~/Projects/avinashs-kingdom/public/data/audits/` |
| Sync command | `npm run sync` inside Kingdom |

## WhatsApp / Voice (Agent Cash)

**Root:** `~/Projects/whatsapp-voice-agents`

| Folder / file | Purpose |
|---------------|---------|
| `STATUS.md` | Version · progress · next tasks |
| `CONTEXT.md` | Frozen product bets |
| `tracking/phases.json` | Phase gates |
| `demo/`, `outreach/`, `offers/`, `ops/` | Demo, brokers, sales, WABA |

## Procedural City (Agent Metro)

**Root:** `~/ProceduralCity`  
**Remote:** `https://github.com/navinash47/ProceduralCity.git`

| Fact | Detail |
|------|--------|
| Truth for Kingdom | Prefer **`origin/main`** `tracking/phases.json` when local branch is behind |
| Local trap | Checkout stuck on `phase26` looked like “26% done” — cloud is ~Phase 48–49 |
| Refresh | `git fetch origin && git checkout main && git pull` |

## ComicMainEngine (Agent Ink)

**Root:** `~/Desktop/ComicMainEngine`  

| Do use | Do **not** confuse with |
|--------|-------------------------|
| `~/Desktop/ComicMainEngine` | `~/ComicEngine` (legacy stub / old notes) |

| File | Purpose |
|------|---------|
| `data/v2a_program.json` | **Kingdom progress for 2A** (A0–A5). Live UI `/v2a` on `:8770` |
| `docs/V2A_ARCHITECTURE.md` | Storyboard-first architecture |
| `data/v2_program.json` | Version 2 (phases 12–20) — **frozen** while 2A runs |
| `data/usage.db` | V1 task board + `api_call` spend (historical) |

Dashboard: `python scripts/run_dashboard.py` → http://127.0.0.1:8770/v2a

## Other provinces

| Venture | Path |
|---------|------|
| YouTube editor | `~/Projects/youtube-editor-lab` (SRS: `docs/SRS.md`) |
| Research Frontier | `~/Projects/research-frontier-lab` |
| BeamDojo | `~/Projects/BeamDojo` (`STATUS.md`, `tracking/expenses.jsonl`, `proofs/*.mp4`) |
| Job Jugaad | `~/Projects/job-jugaad` (tracker UI + API `:8790`, `data/applications.json`) |
| Mac optimize audit | `~/Projects/mac-optimize-audit` (live dashboard `:8742`, `reports/latest.json`) |
| Subscription audit | `~/Projects/subscription-audit` |
| Mac storage audit (legacy) | `~/Projects/mac-storage-audit` |

## Skills backup

| Live | Versioned |
|------|-----------|
| `~/.cursor/skills/` | `~/Projects/avinashs-kingdom/.cursor/skills/` + `brain/backup/cursor-skills/` |

Restore: `./scripts/restore-cursor-skills.sh` from Kingdom.

## Meta tooling (cloned)

| Tool | Path |
|------|------|
| Task Observer upstream | `~/Projects/task-observer` |
| Headroom upstream | `~/Projects/headroom` |
| Observation log | `~/Projects/avinashs-kingdom/brain/skill-observations/` |
| Task Observer skill (personal) | `~/.cursor/skills/task-observer/` |
| Task Observer skill (project) | `~/Projects/avinashs-kingdom/.cursor/skills/task-observer/` |
| Headroom CLI | `~/.local/bin/headroom` |
| Headroom runbook | `brain/wiki/ops/headroom.md` |
| Headroom MCP | `~/.cursor/mcp.json` → server `headroom` |

## Cloudflare public links

```bash
cd ~/Projects/avinashs-kingdom
npm run dashboards           # start all locals
npm run dashboards:status
npm run dashboards:stop
npm run tunnels:list         # ports + start hints
npm run tunnels              # public URLs for every dashboard that is UP
```

Chat: **start dashboards** · **cloudflare links**  
URLs file: `brain/wiki/ops/cloudflare-links.md`.
