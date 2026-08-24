---
type: overview
updated: 2026-08-16
tags: [citizens, map, portfolio]
---

# Citizens’ map of the Kingdom

This brain is the shared memory for everyone building in Avinash’s Kingdom — agents and humans. Read here first; chat is temporary.

**Panel (live UI):** `~/Projects/avinashs-kingdom` → `npm run sync` → `npm run dev` → http://localhost:5173  
**This vault:** `brain/wiki/` (you are here)

## How the country works

| Layer | What it is | Where |
|-------|------------|--------|
| Throne / panel | Live progress, spend, audits | Kingdom repo `public/data/` |
| Laws | Frozen decisions per venture | e.g. WhatsApp `CONTEXT.md` |
| Brain | Compiled understanding | this wiki |
| Skills | Reusable agent playbooks | `~/.cursor/skills/` + repo backup |

## Provinces (ventures) — live 2026-08-16

| Province | Weight | Status | Agent | Page |
|----------|--------|--------|-------|------|
| WhatsApp / Voice cash | 35% P0 | Stage C · Phase 8 · **80%** · $0/$40 | Cash | [[ventures/whatsapp-voice]] |
| YouTube editor | 20% P0 | Phase 0 · SRS · **12%** | Cut | [[ventures/youtube-editor]] |
| Research Frontier | 8% P1 | v0.1 · **12%** | Atlas | [[ventures/research-frontier]] |
| BeamDojo | 6% P1 | Stage 1 smoke · **18%** · A10 GPU | Dojo | [[ventures/beamdojo]] |
| Procedural City | 15% P1 | Stage E · Phase **49** · **~53%** (49/92 via `origin/main`) · $70 | Metro | [[ventures/procedural-city]] |
| ComicMainEngine | 8% P2 | **2A** · A0 passed · A1 next · **17%** · V1 22/22 kept as spend (~$5.88) | Ink | [[ventures/comic-engine]] |
| Job Jugaad | 8% P1 | Tracker v0.1 | Jugaad | [[ventures/job-jugaad]] |
| Kingdom ops | 2% | v1.0 · **70%** · kill list | Steward | [[ventures/kingdom-ops]] |
| Mac optimize | 3% P1 | v0.1 · live `:8742` · RAM/CPU/swap | Janitor | [[ventures/mac-optimize-audit]] |
| Shorts | 0% | **Parked** | — | [[ventures/shorts]] |

## Steward’s dashboard

- Disk + kill list: [[ops/steward-dashboard]]
- **Live tracker (auto on every sync):** [[ops/live-tracker]] — progress formulas, phases, versions

## Sync health (this refresh)

| Source | In panel? | In brain? |
|--------|-----------|-----------|
| WhatsApp STATUS + phases | Yes | Yes (enriched) |
| YouTube STATUS | Yes | Yes |
| Research STATUS | Yes | Yes |
| Procedural City (`origin/main` if local stale) | Yes | Yes |
| ComicMainEngine (`v2a_program.json` @ Desktop) | Yes | Yes |
| Mac optimize audit | Yes (`audits/mac-storage-summary.json` + `:8742`) | Yes → [[ventures/mac-optimize-audit]] |
| Subscription kill list | Yes | Yes → ops dashboard |

Refresh panel anytime: `cd ~/Projects/avinashs-kingdom && npm run sync`.

## Constitution (do not forget)

1. **Cash first** — India WhatsApp/voice for brokers (site visits), not feature theater.  
2. **City before Comic** — Metro gates before Ink expands.  
3. **Anti-slop YouTube** — real clips + provenance; Shorts stay parked.  
4. **Compile knowledge here** — use **kingdom-wiki**; do not trust chat alone.  
5. **After every gate** — update STATUS → **sync-kingdom**.

## Concepts

- [[concepts/india-smb-cash]]
- [[concepts/anti-slop-youtube]]
- [[concepts/llm-wiki]]
- [[concepts/where-files-live]]
