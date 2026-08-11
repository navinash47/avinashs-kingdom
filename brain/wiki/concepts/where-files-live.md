---
type: concept
updated: 2026-08-11
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

Tracker: `data/usage.db` (`task` + `api_call` tables). Dashboard: `python scripts/run_dashboard.py`.

## Other provinces

| Venture | Path |
|---------|------|
| YouTube editor | `~/Projects/youtube-editor-lab` (SRS: `docs/SRS.md`) |
| Research Frontier | `~/Projects/research-frontier-lab` |
| Job Jugaad | `~/Projects/job-jugaad` (Desktop resumes read-only; secrets prompted) |
| Subscription audit | `~/Projects/subscription-audit` |
| Mac storage audit | `~/Projects/mac-storage-audit` |

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
npm run tunnels:list     # ports + start hints
npm run tunnels          # tunnel every dashboard that is UP
# or: ./scripts/cloudflare-dashboards.sh kingdom city comic
```

Writes URLs to `brain/wiki/ops/cloudflare-links.md`. Chat: **cloudflare links**.
