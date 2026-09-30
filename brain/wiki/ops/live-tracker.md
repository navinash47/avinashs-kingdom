---
type: overview
updated: 2026-09-30
tags: [tracker, sync, citizens]
---

# Live tracker

Auto-written by `npm run sync` at **2026-09-30T20:19:55.160Z**. Do not hand-edit — re-run sync after venture gates.

## How progress is calculated

| Venture | Formula |
|---------|---------|
| `whatsapp-voice` | phases_pass / phases_total (from tracking/phases.json) |
| `procedural-city` | phases_pass / phases_total — prefer origin/main when local phase branch is stale |
| `comic-engine` | v2a_program.json phases complete / total when present; else usage.db V1 tasks (not ~/ComicEngine) |
| `youtube-editor` | STATUS.md **Progress** field |
| `research-frontier` | STATUS.md **Progress** field |
| `beamdojo` | STATUS.md **Progress** field (Isaac Lab GPU smokes / trains) |
| `robolab` | STATUS.md **Progress** field (phases + human UI gates) |
| `job-jugaad` | applied-or-beyond / target from data/applications.json (waiting counts; overshoot allowed past milestone) |
| `kingdom-ops` | heuristic ops readiness (70%) until kill-list closure tracked |
| `mac-optimize-audit` | STATUS.md Progress from health score after python3 -m mac_optimize audit |
| `shorts` | always 0 · parked |

## How budget / burn is calculated

- **Monthly budget:** `$portfolio.monthlyBudgetUsd` (see `public/data/portfolio.json`).
- **Tracked burn:** sum(USD expenses including synced kill-list monthly estimates + venture API jsonl) + sum(tokens.entries.usd).
- **Note:** agent.tokenUsedUsd dials are display caps/used hints, not double-counted in throne burn.

## Ventures (synced)

| Venture | Version | Progress | Phases | Priority | Next |
|---------|---------|----------|--------|----------|------|
| WhatsApp / Voice cash engine | Stage C · Phase 8 | 80% | 8/10 | P0 · active | Phase 8: Pilot client contract (pending) |
| YouTube editor + screenplay | Phase 4 · Clip research + provenance | 55% | — | P0 · active | Add Google creds (`GOOGLE_APPLICATION_CREDENTIALS` + `GCS_BUCKET` or Drive folder) → set `CLIP_CLOUD=gcs` and re-run `npm run clips:fetch` to sync cloud. |
| Research Frontier Lab | v0.4.1 | 67% | — | P1 · active | **Phase 5 kickoff** — multi-club scale & polish (catalog phase 5); scaffold stories + signals board. |
| Procedural City | Stage H · Phase 91 | 94% | 91/97 | P1 · active | Phase 91: v1 RELEASE GATE (pending) |
| ComicMainEngine | 2A · A1 passed · A2 Scene cards + storyboard ingest | 33% | 2/6 | P2 · active | A2 Scene cards + storyboard ingest (start) |
| Kingdom ops (subs + expenses) | v1.0 | 70% | — | P1 · active | Cancel/review 6 kill-list seats; reclaim low-risk disk (60% used) |
| Mac optimize audit | v0.1 | 57% | — | P1 · active | Memory pressure is warning |
| Job Jugaad | Tracker v0.1 | 88% | 439/500 | P1 · active | Keep logging — 439/500 toward milestone |
| Shorts tooling | — | 0% | — | parked · parked | Do not focus |
| BeamDojo (Isaac Lab locomotion) | Stage 1 smoke | 18% | — | P1 · active | Dual-terrain Stage 1 (flat physics + imagined beam height scan) then 1024-env CUDA train on the A10. |
| RoboLab | v0.5 · Phase 5B | 48% | — | P1 · active | Human UI confirm gates for Phases 1–4 (dashboard + RunPod checklist). |
| Voice Agent Foundry | Local foundation · 0.1.0 | 30% | — | P1 · active | Validate live voice and provider comparison with approved budget |

## Sources

- Panel JSON: `public/data/ventures.json`
- Board audit: `public/data/audits/phases-board.json`
- Citizens map: [[overview]]
