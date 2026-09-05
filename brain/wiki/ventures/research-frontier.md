---
type: venture
updated: 2026-09-05
tags: [research, atlas, p1]
---

# Research Frontier Lab

- **Id:** `research-frontier`
- **Agent:** Agent Atlas
- **Weight:** 15% · **Priority:** P1
- **Repo:** `~/Projects/research-frontier-lab`
- **Knowledge store:** this brain (`raw/research/` + `wiki/`)
- **Live status:** v0.4.1 · **67%** (Phases 0–4 PASS)

## Job

Club papers → cheap knowledge store → frontier ranking, gaps, and cross-paper analogies.

## First vertical

Generative comics / multimodal consistency (supports ComicMainEngine later).

## Yesterday (2026-09-04) — Phase 4 close-out

- Phase 4 Verify & rank **PASS** (S00–S13; gate 4/4).
- Vercel prod smoke cleared (14/14); evidence-verify wired for git deploy.
- Mapping-check BYO fixes + production human verification recorded.
- Progress email notifier wired (`scripts/notify-progress.mjs`).
- Root `STATUS.md` next: Phase 5 kickoff + keep Story Gate / mapping-check healthy on prod.

## Agent rules (keep separate)

Canonical rules live **in the Frontier repo only**:

- `~/Projects/research-frontier-lab/.cursor/rules/cost-aware-agent-ops.mdc`
- Cost / Bugbot checklist: `docs/ops/cursor-cost.md`

Do **not** apply RoboLab phase/Isaac/RunPod rules here.

## Next milestones

1. Phase 5 kickoff — multi-club scale & polish (catalog phase 5).
2. Keep Vercel Story Gate + mapping-check healthy (`OPENALEX_API_KEY` / `S2_API_KEY`).
3. Optional: Kingdom brain ingest of 1–3 abstracts for the comics vertical.

## Related

- [[architecture/research-frontier]]
- [[concepts/llm-wiki]]
- Skills: **kingdom-wiki**, **sync-kingdom**
