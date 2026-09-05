---
type: concept
updated: 2026-09-05
tags: [resume, jobs, kingdom, eval, role-tracks, robotics]
---

# Resume Master Knowledge

Phase 1 master resume knowledge system - evidence, bullet options, evaluation scores, **role-fit ratings**, and assembled previews **before** final document generation.

## Repository

- **GitHub:** https://github.com/navinash47/resume (private)
- **Local:** Projects/resume
- **Legacy archive:** Portfolio document files copied to resume archive folder plus read-only ingest from Portfolio
- **Portfolio site:** https://navinash47.github.io/Portfolio/ - see ventures/portfolio
- **Featured verdict:** Projects/resume/knowledge/featured-verdict.md (WhatsApp/YouTube deferred rationale)

## Kingdom Sync (Projects)

Run the sync command from the Kingdom project, then run sync-projects and sync:kingdom from the resume project. The sync-projects command updates master.json featured_projects git links from Kingdom manifests. Full workflow documented in Projects/resume/knowledge/SYNC.md.

## Legacy and Archive

Run ingest-legacy to catalog Portfolio plus archive into knowledge/legacy files. Dashboard tab **Legacy / Archive** shows 9 tracks with side-by-side legacy bullets versus current knowledge options.

## Phase 1 Scope

1. **Featured projects:** ComicMainEngine, Procedural City, BeamDojo
2. **Deferred (optional lab bullets only):** WhatsApp, YouTube - see concepts/agentic-resume-gates and knowledge/featured-verdict.md
3. **Seven role tracks:** Artificial Intelligence Engineer, Forward Deployed Engineer, Agentic Engineer, Machine Learning Engineer, **Robotics / Reinforcement Learning Engineer**, Software Development Engineer (mid-level), Software Development Engineer (entry-level)
4. **No final document generation** until dashboard approvals

## Dashboard

Run the ingest-legacy, evaluation, suggest, and dashboard commands from the resume project. The dashboard runs at http://localhost:5199/

**Review tab:** Rate each bullet 1–5 stars per role track. Inline hints derive from role-suggestions.json (4 stars or higher for active role lens) and eval-summary.json (consensus 80% or higher); section headers link to knowledge/RATING_GUIDE.md. Sync saves to knowledge/ratings.json.

**All Resumes tab:** Assembled previews per role using rated bullets only (unrated bullets are excluded with zero score).

Legacy approvals.json migrates as 5 out of 5 (approved) or 0 out of 5 (rejected). User interface: dark brass theme, role lens chips, evaluation bars. Details: Projects/resume/dashboard/README.md.

## Phase 2 - Export and Kingdom Sync

After role ratings, run the export command for all 7 tracks. Use the role flag for specific tracks like robotics with preview-suggestions. Use preview-suggestions with dry-run to compare suggestions without finalizing. Run sync:kingdom to update the resume-knowledge.json file.

Export uses rated bullets only; unrated bullets are excluded with zero score. Use preview-suggestions to compare suggestion fill before rating.

Preview assembly includes **Computer Science 685** and **Five College Marketplace** sections; sync:kingdom mirrors eval_stats.top_consensus (top evaluation picks by cross-role consensus) into the Kingdom Resume panel.

## Finish Pipeline (One Command)

After bullets are rated and synced to knowledge/ratings.json (unrated bullets excluded with zero score), run finish:resume which executes export, compiles document files, and syncs to Kingdom.

Warns on unrated bullets; exits with error only if zero bullets rated. Venture Fleet Control Plane: POST to services/resume/finish-resume or Resume panel to **Run finish pipeline**.

**Guided dashboard order:** Review tab callout - Summary to Skills to Experience to Projects to Education. Sync after each session; sync:kingdom refreshes Kingdom panel.

Post-finish (manual): LinkedIn sign-off, pick 1–2 primary tracks from knowledge/ROLE_COMPARISON.md, register defaults in Job Jugaad - see ventures/job-jugaad#after-ratings.

## Knowledge Layout

| Path | Purpose |
|------|---------|
| knowledge/master.json | Sections, featured/deferred projects, confirmed metrics |
| knowledge/featured-verdict.md | Featured versus deferred versus excluded - WhatsApp/YouTube rationale |
| knowledge/bullets/*.json | Multiple choices per section (Situation-Task-Action-Result variants) |
| knowledge/roles.json | Seven role tracks |
| knowledge/ratings.json | Per-bullet per-role 1–5 star ratings |
| knowledge/role-suggestions.json | Heuristic role-fit from suggest command |
| resume-knowledge.json | Kingdom user interface embed summary |

## Confirmed Metrics

- Mastercard Enhanced Currency Conversion: **around 20% latency reduction** (user confirmed)
- Biomedical Natural Language Processing: 27 weighted F1 at Recall@10 (verify with principal investigator; medication F1 0.69 in report)
- ComicMainEngine Version 1: 22/22 board tasks
- Procedural City: Stage E, 52/92 phases (local status)
- BeamDojo: Stage 1 smoke test, 18%
- WhatsApp: Phase 8 around 80% - **deferred** until pilot
- YouTube: around 32% - **deferred** until dogfood video

## Related

- concepts/agentic-resume-gates
- concepts/agentic-interview-prep
- ventures/job-jugaad
- ops/git-repos

## Goal Status (2026-09-02)

**Ratings complete** - **85/85** bullets rated on disk (+4 robotics-lab from legacy Portfolio); finish:resume ran 2026-09-02 (export to 7 documents to kingdom sync). Kingdom status: ready_for_export. **Still blocked on user:** LinkedIn sign-off (knowledge/linkedin.json **DRAFT**), Job Jugaad primary track pick. Do **not** mark the Cursor goal complete until both gates pass.

**Checklist:** Projects/resume/GOAL_CHECKLIST.md - done versus blocked, step-by-step finish flow, WhatsApp/YouTube deferred reconciliation.

| Area | Done | Blocked on user |
|------|------|-----------------|
| 85 bullet options + 7 role tracks | Yes | - |
| **85/85 bullet ratings** on disk | Yes | - |
| Featured: ComicMainEngine, Procedural City, BeamDojo | Yes | - |
| Deferred: WhatsApp, YouTube (optional lab bullets) | Yes | Re-feature after gates |
| Legacy ingest (Robotics/Machine Learning/Mix documents) | Yes | - |
| Export + 7 preview documents (finish:resume) | Yes | Re-run after rating changes |
| Kingdom sync + wiki + finish orchestrator | Yes | - |
| LinkedIn drafts | Yes | **DRAFT** - sign-off before posting |
| Job Jugaad primary track(s) | - | Pick after document review |

## Agent Handoff (2026-09-02)

All automated infrastructure work is **complete**. Remaining gates are LinkedIn sign-off and Job Jugaad track pick - not agent work.

**Verified on disk:**

| Check | Status |
|-------|--------|
| 85 bullet options + 7 role tracks | ✓ |
| **85/85 bullet ratings** (knowledge/ratings.json) | ✓ |
| Dashboard version 3 (Review, All Resumes, Legacy / Archive tab) | ✓ |
| Evaluation to knowledge/eval-summary.json | ✓ |
| 7 preview documents in tracks/preview-pdf/ | ✓ |
| finish:resume pipeline + fleet control plane hook | ✓ (ran 2026-09-02) |
| knowledge/linkedin.json drafts | ✓ (**DRAFT** - not signed off) |
| Kingdom sync to resume-knowledge.json | ✓ (85/85, ready_for_export) |

**User gates (do not bypass):**

1. **LinkedIn sign-off** - approve headline/about in Kingdom Resume tab; linkedin.json is **DRAFT**; do not post until signed off
2. **Pick 1–2 primary Job Jugaad tracks** - compare documents + knowledge/ROLE_COMPARISON.md

Agents: do **not** fake LinkedIn approval, pick Job Jugaad tracks on the user's behalf, or mark the Cursor goal complete. Unrated bullets are excluded with zero stars; preview-suggestions is comparison-only.
