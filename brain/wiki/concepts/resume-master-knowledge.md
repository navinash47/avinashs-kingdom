---
type: concept
updated: 2026-09-02
tags: [resume, jobs, kingdom, eval, role-tracks, robotics]
---

# Resume master knowledge

Phase 1 master resume knowledge system — evidence, bullet options, eval scores, **role-fit ratings**, and assembled previews **before** final LaTeX.

## Repo

- **GitHub:** https://github.com/navinash47/resume (private)
- **Local:** `~/Projects/resume`
- **Legacy archive:** Portfolio `.tex` files copied to `resume/archive/` + read-only ingest from `~/Portfolio`
- **Portfolio site:** https://navinash47.github.io/Portfolio/ — see [[ventures/portfolio]]
- **Featured verdict:** `~/Projects/resume/knowledge/featured-verdict.md` (WhatsApp/YouTube deferred rationale)

## Kingdom sync (projects)

```bash
cd ~/Projects/avinashs-kingdom && npm run sync
cd ~/Projects/resume && npm run sync-projects && npm run sync:kingdom
```

`sync-projects` updates `knowledge/master.json` featured_projects git links from Kingdom manifests. Full workflow: `~/Projects/resume/knowledge/SYNC.md`.

## Legacy / Archive

```bash
npm run ingest-legacy   # catalog Portfolio + archive → knowledge/legacy-*
```

Dashboard tab **Legacy / Archive** — 9 tracks, side-by-side legacy bullets vs current knowledge options.

## Phase 1 scope

1. **Featured projects:** ComicMainEngine, Procedural City, BeamDojo
2. **Deferred (optional lab bullets only):** WhatsApp, YouTube — see [[concepts/agentic-resume-gates]] and `knowledge/featured-verdict.md`
3. **Seven role tracks:** AI Engineer, FDE, Agentic Engineer, MLE, **Robotics / RL Engineer**, SDE mid, SDE entry
4. **No final .tex** until dashboard approvals

## Dashboard

```bash
cd ~/Projects/resume
npm run ingest-legacy
npm run eval
npm run suggest
npm run dashboard   # http://localhost:5199/
```

**Review tab:** rate each bullet 1–5 stars per role track. Inline hints derive from `role-suggestions.json` (≥4★ for active role lens) and `eval-summary.json` (consensus ≥80); section headers link to `knowledge/RATING_GUIDE.md`. Sync → `knowledge/ratings.json`.

**All Resumes tab:** assembled previews per role using rated bullets only (unrated = 0, excluded).

Legacy `approvals.json` migrates as 5/5 (approved) or 0/5 (rejected). UI: dark brass theme, role lens chips, eval bars. Details: `~/Projects/resume/dashboard/README.md`.

## Phase 2 — export & Kingdom sync

After role ratings:

```bash
cd ~/Projects/resume
npm run export              # all 7 tracks → tracks/track-{role}.tex
npm run export -- --role robotics --preview-suggestions
npm run export -- --preview-suggestions --dry-run   # compare suggestions (not final)
npm run sync:kingdom        # updates public/data/resume-knowledge.json
```

Export uses rated bullets only; unrated bullets = 0 (excluded). Use `--preview-suggestions` to compare suggestion fill before rating.

Preview assembly includes **CS685** and **FCM** sections; `sync:kingdom` mirrors `eval_stats.top_consensus` (top eval picks by cross-role consensus) into the Kingdom Resume panel.

## Finish pipeline (one command)

After bullets rated and Synced to `knowledge/ratings.json` (unrated = 0, excluded):

```bash
cd ~/Projects/resume
npm run finish:resume   # export → compile:pdfs → sync:kingdom
```

Warns on unrated bullets; exits **1** only if zero bullets rated. Venture Fleet Control Plane: `POST /api/services/resume/finish-resume` or Resume panel → **Run finish pipeline**.

**Guided dashboard order:** Review tab callout — Summary → Skills → Experience → Projects → Education. Sync after each session; `npm run sync:kingdom` refreshes Kingdom panel.

Post-finish (manual): LinkedIn sign-off, pick 1–2 primary tracks from `knowledge/ROLE_COMPARISON.md`, register defaults in Job Jugaad — see [[ventures/job-jugaad#after-ratings]].

## Knowledge layout

| Path | Purpose |
|------|---------|
| `knowledge/master.json` | Sections, featured/deferred projects, confirmed metrics |
| `knowledge/featured-verdict.md` | Featured vs deferred vs excluded — WhatsApp/YouTube rationale |
| `knowledge/bullets/*.json` | Multiple choices per section (XYZ/STAR/CAR/PAR) |
| `knowledge/roles.json` | Seven role tracks |
| `knowledge/ratings.json` | Per-bullet per-role 1–5 star ratings |
| `knowledge/role-suggestions.json` | Heuristic role-fit from `npm run suggest` |
| `public/data/resume-knowledge.json` | Kingdom UI embed summary |

## Confirmed metrics

- Mastercard ECC: **~20% latency reduction** (user confirmed)
- BioNLP: 27 w-F1 @ Recall@10 (verify with PI; medication F1 0.69 in report.pdf)
- Comic V1: 22/22 board tasks
- City: Stage E, 52/92 phases (local STATUS)
- BeamDojo: Stage 1 smoke, 18%
- WhatsApp: Phase 8 ~80% — **deferred** until pilot
- YouTube: ~32% — **deferred** until dogfood video

## Related

- [[concepts/agentic-resume-gates]]
- [[concepts/agentic-interview-prep]]
- [[ventures/job-jugaad]]
- [[ops/git-repos]]

## Goal status (2026-09-02)

**Ratings complete** — **85/85** bullets rated on disk (+4 robotics-lab from legacy Portfolio); `npm run finish:resume` ran 2026-09-02 (export → 7 PDFs → kingdom sync). Kingdom status: `ready_for_export`. **Still blocked on user:** LinkedIn sign-off (`knowledge/linkedin.json` **DRAFT**), Job Jugaad primary track pick. Do **not** mark the Cursor goal complete until both gates pass.

**Checklist:** `~/Projects/resume/GOAL_CHECKLIST.md` — done vs blocked, step-by-step finish flow, WA/YT deferred reconciliation.

| Area | Done | Blocked on user |
|------|------|-----------------|
| 85 bullet options + 7 role tracks | Yes | — |
| **85/85 bullet ratings** on disk | Yes | — |
| Featured: Comic, City, BeamDojo | Yes | — |
| Deferred: WhatsApp, YouTube (optional lab bullets) | Yes | Re-feature after gates |
| Legacy ingest (Robotics/MLE/Mix .tex) | Yes | — |
| Export + 7 preview PDFs (`finish:resume`) | Yes | Re-run after rating changes |
| Kingdom sync + wiki + finish orchestrator | Yes | — |
| LinkedIn drafts | Yes | **DRAFT** — sign-off before posting |
| Job Jugaad primary track(s) | — | Pick after PDF review |

## Agent handoff (2026-09-02)

All automated infrastructure work is **complete**. Remaining gates are LinkedIn sign-off and Job Jugaad track pick — not agent work.

**Verified on disk:**

| Check | Status |
|-------|--------|
| 85 bullet options + 7 role tracks | ✓ |
| **85/85 bullet ratings** (`knowledge/ratings.json`) | ✓ |
| Dashboard v3 (Review, All Resumes, Legacy / Archive tab) | ✓ |
| `npm run eval` → `knowledge/eval-summary.json` | ✓ |
| 7 preview PDFs in `tracks/preview-pdf/` | ✓ |
| `npm run finish:resume` pipeline + fleet control plane hook | ✓ (ran 2026-09-02) |
| `knowledge/linkedin.json` drafts | ✓ (**DRAFT** — not signed off) |
| Kingdom sync → `public/data/resume-knowledge.json` | ✓ (85/85, `ready_for_export`) |

**User gates (do not bypass):**

1. **LinkedIn sign-off** — approve headline/about in Kingdom Resume tab; `linkedin.json` is **DRAFT**; do not post until signed off
2. **Pick 1–2 primary Job Jugaad tracks** — compare PDFs + `knowledge/ROLE_COMPARISON.md`

Agents: do **not** fake LinkedIn approval, pick Job Jugaad tracks on the user's behalf, or mark the Cursor goal complete. Unrated bullets = 0★ excluded; `--preview-suggestions` is comparison-only.
