# Wiki log

Append-only. Prefix each entry with `## [YYYY-MM-DD] <op> | <title>` so recent activity is greppable.

## [2026-09-02] ops | Phase 2 W1 — Obs 11 merge playbook

Encoded cloud→Mac UI merge rules in `.cursor/skills/sync-kingdom/SKILL.md` (+ `~/.cursor` mirror) and [[ops/cloud-ui-merge-playbook]]. Keep-ours: App.tsx / OrchestratorProvider / VentureSidebar·VenturePage / FleetGraph/. Fold-in: Research Lab / Vite `/live`. Obs 11 → ACTIONED.

## [2026-09-02] ops | Phase 2 hard-10% design pack

SRS [[concepts/personal-os-phase2-srs]], builder prompt [[ops/personal-os-phase2-builder-prompt]], live tracker [[ops/personal-os-phase2-tracker]], plan `.cursor/plans/personal_os_phase2_hard10.plan.md`. Workstreams ordered W1 merge playbook → W2 LLM judge → W3 auto-wiki → W4 MCP. Implementation not started (W0 design only).

## [2026-09-02] ops | Lint heuristic v2 + ingest extract + hygiene

`brain/harness/lint.mjs` → heuristic **v2**: still errors only on broken links; new **warnings** for conflicting venture lifecycle/priority phrases across pages, duplicate claim bullets, and `updated:` lagging recent `wiki/log.md` mentions (`--log-lag-days`). `brain:ingest --file` best-effort extracts title + summary bullets into the source stub and prints review/complete-with-kingdom-wiki checklist. Fixed missing `updated:` on [[ops/ci-template]]. Triaged skill-observation backlog (8 ACTIONED, 7 remain OPEN). Sync panel refresh committed. Docs: harness README, [[ops/personal-os-playbook]], AGENTS, kingdom-wiki skill. **Still not** an LLM claim judge.

## [2026-09-02] ops | Lint heuristic v1 + semi-auto ingest

Extended `brain/harness/lint.mjs`: broken links remain errors; warnings for missing/stale `updated:`, duplicate H1 titles, duplicate `venture_id`, path mismatches, light duplicate topics (`--stale-days`, `--strict`). Hardened `brain:ingest --file` to scaffold `wiki/sources/<slug>.md` by default and print exact index/log checklist (LLM compile still kingdom-wiki). Documented in harness README, [[ops/personal-os-playbook]], [[concepts/kingdom-personal-os]], [[concepts/llm-wiki]].

## [2026-09-02] ops | Personal OS wiki toolchain + playbook

Shipped compiled-wiki commands under `brain/harness/`: `lint.mjs`, `wiki-query.mjs`, `ingest.mjs`; npm `brain:lint` / `brain:query` / `brain:ingest` / `brain:harness`; `scripts/new-venture.mjs` (`venture:new`). Throne Virtual control surfaces capability chips + onboard hint from control-surface. Daily loop: [[ops/personal-os-playbook]] · architecture [[concepts/kingdom-personal-os]] · onboard [[concepts/onboard-new-project]].

## [2026-09-02] ops | Kingdom personal OS architecture

Brain reframed as reusable personal OS (not FSM/KG toy): [[concepts/kingdom-personal-os]] + [[concepts/onboard-new-project]]. Harness schema now documents venture/skill/capability/sync/control contract; `config/venture-template.json` + control-surface `onboarding` pointer. Sync emits capability edges. [[concepts/brain-harness-fsm]] · [[concepts/virtual-control-surface]].

## [2026-09-02] ops | Resume knowledge phase 2 prep

Phase 2 scaffolding without final bullet lock: full `scripts/export-tex.mjs` (approvals gate + consensus fallback + `--dry-run`), `scripts/sync-kingdom-data.mjs` → `public/data/resume-knowledge.json` approval/eval stats, LinkedIn drafts (`knowledge/linkedin.json` mirrored to `public/data/linkedin-draft.json`). Dashboard gained eval rank display, status filter (pending/approved/rejected), and **Approve top pick per section** bulk action. Kingdom `npm run build` fixed (ThroneOverview + AgentRoster props, `updateVenture`). Featured projects remain ComicMainEngine, Procedural City, BeamDojo (+ CS685 / Five College if approved). WhatsApp + YouTube excluded. **Blocked:** user must approve bullets in dashboard before export writes final `.tex` and LinkedIn manual update. [[concepts/resume-master-knowledge]] · [[ventures/job-jugaad]]

## [2026-08-24] ops | Research Lab live training + W&B

Kingdom Research Lab now shows a **Live training** card (status idle/running/unknown, W&B link, NFS/checkpoint paths). BeamDojo sync reads gitignored `tracking/training-status.json` (example snapshot if live file is missing). Lambda has no public Isaac page — Avinash watches metrics at Weights & Biases project `beamdojo`, or TensorBoard through `ssh -L 6006:localhost:6006 lambda-beamdojo`. Do not claim a long train is running without that JSON. [[concepts/research-lab]] · [[ventures/beamdojo]].

## [2026-08-24] ops | Research Lab + BeamDojo GPU province

Kingdom gained a **Research** tab (`/?tab=research`) for future lab projects. First GPU project: **BeamDojo** (`~/Projects/BeamDojo`) — Isaac Lab H1 Stage 1 CUDA smoke on Lambda A10, proof mp4, expenses JSONL. Orchestrator rule: checkpoints never git; tell Avinash to copy them as insurance. Wiki [[concepts/research-lab]] · [[ventures/beamdojo]].

## [2026-08-20] ops | Mac optimize audit province + live cleaner

New venture `mac-optimize-audit` / Agent Janitor at `~/Projects/mac-optimize-audit`. Live dashboard **:8742** (RAM, swap, pressure, CPU runaways, safe cleaners). Replaces the static storage-report server. First snapshot: 16 GB Air, 34 days up, Structured ~100%+ CPU, Zen ~3.8 GB, Cursor ~3.6 GB, swap ~1.5 GB. Kingdom **Mac** tab + sync. [[ventures/mac-optimize-audit]]

## [2026-08-16] ops | Comic 2A is the Kingdom progress source

Version 2A started (A0 architecture freeze complete). Sync now reads `~/Desktop/ComicMainEngine/data/v2a_program.json` instead of treating V1 `usage.db` 22/22 as 100% done. Panel: **2A · A0 passed · A1 Story Architect**. Wiki [[ventures/comic-engine]] + [[concepts/where-files-live]] updated. Version 2 (`v2_program.json`) stays frozen.

## [2026-08-11] ops | Job Jugaad tracker + Kingdom seed

Scaffolded `~/Projects/job-jugaad` applications board (company + role pipeline, :8790). Seeded venture `job-jugaad` / `agent-jugaad` (weight 8%). Sync writes `audits/job-jugaad-applications.json`. [[ventures/job-jugaad]]

## [2026-08-11] ingest | YouTube house video style (all future videos)

Human asked to log craft for future styles: friend VO, clear wording, sink-in pauses, analogies, montages, quality over runtime, E2/title locks as specimen. Canonical [[concepts/youtube-house-video-style]] · raw `youtube-house-video-style-2026-08-11` · [[sources/youtube-house-video-style-2026-08-11]] · venture [[ventures/youtube-editor]] points agents here first.

## [2026-08-11] ingest | Video 1 title + E2 lock

Human: title **Are some people blind?**; pick broadest example → **E2 group-chat forward** (over E1 shopping). Updated [[concepts/layman-screenplay-craft]] + [[ventures/youtube-editor]].

## [2026-08-11] ingest | Layman screenplay craft (show-first)

Human locked Rajamouli show-don’t-tell for Video 1: example cold open (E1 shopping), term-flash graphics later, learning payoff. [[concepts/layman-screenplay-craft]] · [[sources/youtube-screenplay-layman-craft-2026-08-11]] · venture [[ventures/youtube-editor]] updated.

## [2026-08-11] ops | Headroom = MCP only (OmniRoute keeps Base URL)

Cursor Override Base URL stays OmniRoute. Headroom used via MCP compress/retrieve/stats; proxy optional for stats only. Updated [[ops/headroom]].

## [2026-08-11] ops | Task Observer global + Headroom live

Mirrored `task-observer` to `~/.cursor/skills/`. Installed `headroom-ai` CLI, Kingdom `npm run headroom:*` scripts, MCP registration, proxy on :8787. Runbook [[ops/headroom]]. Cursor still needs one manual Override Base URL click for BYOK path.

## [2026-08-11] ingest | Task Observer + Headroom eval

Cloned `~/Projects/task-observer` and `~/Projects/headroom`. Wired Task Observer into Kingdom project skills + `brain/skill-observations/`. Headroom left as optional token proxy (not brain learning). Concept: [[concepts/task-observer-headroom]].

## [2026-08-11] ingest | City origin/main + ComicMainEngine correction

Fixed hallucination: local City `phase26` was stale; truth is `origin/main` **49/92 pass** (through phase 48, current 49). Comic venture is **ComicMainEngine** at `~/Desktop/ComicMainEngine` (22/22 tasks, ~$5.88), not `~/ComicEngine`. Sync now prefers the richer City source and reads `usage.db`.

## [2026-08-11] ingest | YouTube Phase 0 SRS

Landed Veritasium formula doctrine, dual narration, Cut Control/CI/multi-agent plan as docs+schemas in `youtube-editor-lab`. Brain concepts [[concepts/veritasium-formula]] + [[concepts/multi-agent-youtube]]; venture page updated to Phase 0 · 12%.

## [2026-08-11] ingest | Live kingdom census

Pulled live STATUS / phases / audits into the brain for all provinces. Confirmed panel sync with WhatsApp, YouTube, Research, Procedural City, ComicEngine, Mac storage, and subscription kill list. Added citizens’ map (`overview`), [[concepts/where-files-live]], and [[ops/steward-dashboard]]. Enriched venture pages with progress, budgets, and phase counts.

## [2026-08-11] bootstrap | Kingdom brain seed

Created vault layout (`raw/`, `wiki/`), overview, venture pages, starter concepts, index, and Cursor skill pack pointers. No external sources ingested yet.

## [2026-08-11] career | Agentic AI resume + Job Jugaad seed

- Track A/B resumes (LaTeX + Desktop PDFs); Portfolio bio → Applied AI / agents
- Job Jugaad wishlist: 30 company+role rows; CAREER_MARKETING.md + STUDY.md
- Wiki concepts: agentic-interview-prep, agentic-resume-gates

## [2026-09-02] ingest | Virtual control surface + brain harness

- Added [[concepts/virtual-control-surface]] and [[concepts/brain-harness-fsm]].
- Sync now writes `public/data/control-surface.json` and `brain/harness/empty-model/{graph,fsm}.json`.
- Restored OrchestratorProvider control plane App (Throne = virtual control).
