# Wiki log

Append-only. Prefix each entry with `## [YYYY-MM-DD] <op> | <title>` so recent activity is greppable.

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
