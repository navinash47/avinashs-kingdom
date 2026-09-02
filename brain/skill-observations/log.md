# Skill observation log

Stable path: `brain/skill-observations/log.md`  
Upstream methodology: rebelytics task-observer (CC BY 4.0).

## 2026-08-11 — job-jugaad tracker + kingdom-tunnels

- **Pattern:** New shareable venture UI = own repo + file-backed JSON API on a dedicated port + STATUS derived from data + Kingdom seed/sync + `jugaad` row in start/cloudflare scripts. Friend share uses tunnel to that port only (not full Kingdom).
- **Skill:** `kingdom-tunnels`, `sync-kingdom`

## 2026-08-11 — kingdom-tunnels / cloudflare links

- **Friction:** `cloudflare links` previously tunneled only already-UP ports; tunnels spawned with plain `&` died when the agent shell exited (Error 1033); early HTTP/DNS probes NXDOMAIN-poisoned resolvers ~30m; rapid recreates hit Cloudflare quick-tunnel **429 / 1015**.
- **Fix:** `cloudflare-dashboards.sh` now always starts locals first; both start + tunnel use detached `start_new_session`; readiness via DoH + `--resolve` (no early system DNS); 429 backoff; skill says never ask user to start first.
- **Skill:** `kingdom-tunnels`

### Observation 1: Career rebrand deliverables live outside Kingdom-only paths

**Status:** ACTIONED (2026-09-02) — created `.cursor/skills/career-rebrand` (+ ~/.cursor mirror); checklist syncs resume KB, CAREER_MARKETING, LinkedIn, wiki, sync
**Date:** 2026-08-11
**Session context:** Implement Agentic AI career + resume plan (Track A/B, Job Jugaad wishlist, study/gates wiki)
**Skill:** New skill candidate: career-rebrand / job-jugaad targeting
**Type:** internal
**Phase/Area:** Job search packaging + Kingdom wiki sync

**Issue:** Resume LaTeX/PDFs live under ~/Portfolio and Desktop; Job Jugaad holds marketing/study mirrors; durable targeting concepts belong in brain/wiki. Easy to update one layer and leave others stale (Portfolio bio vs LinkedIn vs Track A).

**Suggested improvement:** Document a single checklist in job-jugaad CAREER_MARKETING (done) and always sync Kingdom wiki concepts + applications.json together when rebranding. Consider a `career-rebrand` skill that lists files to touch in order.

**Principle:** Multi-surface career packaging (resume, LinkedIn, tracker, wiki) needs an explicit sync checklist or it drifts like venture STATUS vs wiki.

### Observation 5: CICStep weekly form is a recurring Kingdom-to-career mapping

**Status:** ACTIONED (2026-09-02) — created `.cursor/skills/cicstep-weekly` (+ ~/.cursor mirror) with sources, checkbox defaults, non-claims
**Date:** 2026-08-20
**Session context:** Draft CICStep weekly check-in from Kingdom logs; user will rewrite; report last week because of San Jose move
**Skill:** New skill candidate: cicstep-weekly (internal)
**Type:** internal
**Phase/Area:** Career reporting vs venture STATUS

**Issue:** CICStep asks for activity checkboxes (personal projects / CICS events / alumni mentorship / research lab) plus 100-word accomplishments, next-week priority, and goals. Kingdom has the facts (STATUS, PROJECT_LOG, wiki log) but no playbook for mapping ventures to CICStep categories, excluding scaffolding-as-outreach, and writing in the user's voice. Easy to overclaim (broker outreach, job applications, CICS lab) from panel progress.

**Suggested improvement:** When the user asks for CICStep / CICS Careers weekly: pull last 7 days from wiki/log + venture PROJECT_LOG/STATUS; default checkboxes to personal projects unless they confirm events/mentorship/UMass lab; list honest non-accomplishments; draft messy first-person copy they can edit.

**Principle:** Recurring institutional check-ins should be compiled from source-of-truth logs, then mapped to the form's categories with explicit non-claims, not summarized from chat memory.

### Observation 6: CICStep drafts skipped P1 City because next-gate was pending

**Status:** ACTIONED (2026-09-02) — folded into cicstep-weekly coverage rules (dated PROJECT_LOG / always mention P0–P1)
**Date:** 2026-08-20
**Session context:** User asked why Procedural City was missing from CICStep CS writeup
**Skill:** New skill candidate: cicstep-weekly (internal)
**Type:** internal
**Phase/Area:** Venture coverage / PROJECT_LOG dates

**Issue:** First CICStep draft treated City as "no work this week" because live-tracker next-line was Phase 49 pending. PROJECT_LOG shows Aug 10 (start of the reporting week) closed Stage D streaming (phases 38–47) and passed Phase 48 structured-output smoke. Panel "next pending" hid a large Monday dump.

**Suggested improvement:** For weekly reports, scan PROJECT_LOG / phase evaluation dates in the window, not only current_phase pending. Always mention P0/P1 ventures even if the next gate is open; distinguish "landed this week" vs "still the long-running lab."

**Principle:** A pending next milestone is not evidence that nothing shipped; dated gate logs are.

### Observation 7: Mac “stuck” was CPU/swap, not disk percent

**Status:** ACTIONED (2026-09-02) — mac-optimize-audit live :8742 + Kingdom Mac tab; memory/CPU/swap is source of truth
**Date:** 2026-08-20
**Session context:** User asked to speed up a stalling Mac; Kingdom already had a storage-only audit at 45.8% disk
**Skill:** sync-kingdom / kingdom-tunnels (mac port) · New skill candidate: mac-optimize
**Type:** internal
**Phase/Area:** Ops audits vs perceived machine health

**Issue:** Kingdom ops treated Mac slowness as disk reclaim because `mac-storage-audit` was the only wired signal. Live process scan showed 34-day uptime, memory pressure warning, 1.5 GB swap, Structured.app at ~100–220% CPU, Zen ~3.8 GB. Disk was not the stall.

**Suggested improvement:** Keep the live `:8742` optimizer (RAM/CPU/swap + runaway quit) as the Mac source of truth. Do not recommend cache deletion as the first fix for UI freezes. Path-map + STATUS_SOURCES + seed + dashboard port for any new ops tool (same pattern as Job Jugaad).

**Principle:** Perceived machine slowness is diagnosed from memory pressure, swap, and runaway CPU first; disk-used percent is a poor proxy and will send cleanup work at the wrong layer.

### Observation 8: macOS TCC blocks Python from listing ~/.Trash

**Status:** ACTIONED (2026-09-02) — mac_optimize/clean.py empties Trash via Finder osascript
**Date:** 2026-08-21
**Session context:** Empty Trash cleaner failed with EPERM on ~/.Trash
**Skill:** New skill candidate: mac-optimize
**Type:** open-source
**Phase/Area:** Cleaners / macOS privacy

**Issue:** `pathlib.Path.home() / ".Trash"` listing and `du` return Operation not permitted even with a full-privilege shell. Full Disk Access is the wrong first fix. Finder already owns Trash.

**Suggested improvement:** Empty Trash with `osascript` → Finder (`empty the trash`). Ask for Automation permission if needed. Do not treat EPERM on TCC-protected folders as a generic IOError.

**Principle:** On macOS, user-data folders the kernel hides from the calling binary should be mutated through the owning app’s Apple Event, not by listing the on-disk path.



### Observation 9: TMPDIR dashboard pidfiles vanish; recycled PIDs are not identity

**Status:** ACTIONED (2026-09-02) — kingdom-tunnels Diagnose DOWN: pid ≠ identity (workspace + ~/.cursor)
**Date:** 2026-08-21
**Session context:** Browser ERR_CONNECTION_REFUSED on Mac optimize dashboard :8742; last-known pid ~1914 from prior chat
**Skill:** kingdom-tunnels
**Type:** open-source
**Phase/Area:** Local dashboard start / diagnose DOWN

**Issue:** Connection refused on a Kingdom dashboard port. Chat memory still had an old pid. That pid was alive but was an unrelated system process, not the Python serve command. The TMPDIR kingdom-dashboards directory (pidfile + log) was gone entirely, so the process had never rebound after reboot/sleep/tmp cleanup.

**Suggested improvement:** In the Agent steps / diagnose-DOWN path: do not trust a remembered pid. Confirm LISTEN on the port, then that the pidfile process command line matches the expected serve command. If the TMPDIR kingdom-dashboards dir is missing, treat as unrebound after reboot and restart via start-dashboards.sh. Never treat a live pid number as proof the dashboard is up.

**Principle:** Ephemeral tmp pidfiles disappear across reboot; a live process ID from earlier context is not identity — verify the listening port and the process command line before concluding a service is running.

## 2026-08-24 — architecture board UI + experiment sync
- **Pattern:** Architecture wiki sections should render as cards/flows (ArchitectureBoard), not MarkdownBlock dumps. Experiment bullets with `**date:**` need colon-inside-bold regex. Embed iframes must use direct dashboard URLs (and `/v2a` for Comic), never `/embed/` proxies that break `fetch('/api')`.
- **Skill:** kingdom-wiki / sync-kingdom

## 2026-08-24 — Cloudflare mirror sync buttons
- **Friction:** trycloudflare guest view drifts from local (stale `share-url.json` / seed JSON / iframe caches); polling alone isn’t enough.
- **Fix:** Host **Sync for friends** (runs sync + remounts embeds); guest **Refresh mirror** (reload seed + remount iframes via `kingdom-mirror-refresh`).
- **Skill:** kingdom-tunnels

## 2026-08-24 — City stage proofs empty in Kingdom embed
- **Friction:** City `serve_dashboard` kept a stale imported `refresh_dashboard` and did not watch `reports/`, so walkthrough MP4s never entered `stage_proofs` and the iframe showed “No stage proofs yet”.
- **Fix:** reload refresh module each tick; watch `reports/`; Kingdom `CityStageProofsPanel` + `city-stage-proofs.json` via sync; iframe `#proofs`.
- **Skill:** sync-kingdom / kingdom-tunnels

## 2026-08-24 — Share link spun forever (api.trycloudflare.com)
- **Friction:** Failed tunnel DNS logged `Post "https://api.trycloudflare.com/tunnel"`; URL regex treated that as the guest link. **Sync for friends** only syncs data — does not recreate tunnels.
- **Fix:** exclude `api.trycloudflare.com` from extract + share-url writer; banner warns when offline; re-run `npm run share` with real network for a live guest URL.
- **Skill:** kingdom-tunnels

## 2026-08-24 — Fleet graph tab (@xyflow/react)
- **Pattern:** Cross-venture topology as React Flow hub/spoke (registry + agents + services + optional skills), NodeInspector drawer, deep link `?tab=graph&node=`, palette Focus-in-Graph. Live UP/DOWN from `/api/services`.
- **Skill:** sync-kingdom (data already seeded; graph is client-side)

## 2026-08-24 — Research Lab vs cash ventures
- **Pattern:** GPU/paper work gets `kind: research` in the venture registry, a dedicated Research tab (`/?tab=research`), proof mp4s under `proofs/` → `public/data/research/<id>/`, and expense JSONL → ledger. Do not dump the rest of a dirty Kingdom tree into that commit; origin App may still be the old tab UI.
- **Never:** git-commit `*.pt`. Tell Avinash the NFS checkpoint path as insurance.
- **Skill:** sync-kingdom, kingdom-wiki

## 2026-08-24 — Research Lab JSON field names
- **Friction:** Sync writes camelCase (`field`, `summary`, `spendUsd`). Easy to build the Research tab against snake_case and ship empty cards.
- **Fix:** Type the Research Lab off `public/data/research-lab.json` keys; parse mermaid `source` into a file-talk graph when `svg_inline` is null.
- **Skill:** sync-kingdom

### Observation 10: Research file-talk graphs died on mermaid `ID["label"] -->` lines

**Status:** ACTIONED (2026-09-02) — `src/lib/researchGraph.ts` parseMermaidFlow allows optional `[...]` before `-->`
**Date:** 2026-08-24
**Session context:** User reported Fleet graph empty; meant the Research Lab how-files-talk graph
**Skill:** sync-kingdom
**Type:** internal
**Phase/Area:** Research Lab mermaid → graph

**Issue:** Architecture mermaid is `Mac["label"] -->|ssh| GPU["label"]`. A naive `ID --> ID` regex never fires, so the file graph rendered nothing. Frontier also had empty `diagrams[]`. Clicking “Fleet graph” on a research card called `focusGraphNode` without taking it from the orchestrator context.

**Suggested improvement:** Parse optional `[...]` between node id and `-->`; fall back to an experiment/file graph when mermaid is missing; keep React Flow canvases at a fixed height or they paint blank.

**Principle:** Flowchart mermaid almost always puts `["label"]` on the same line as arrows — parsers must allow that, and graph canvases need an explicit height.

### Observation 11: Cloud-agent UI branches replay an older App shell

**Status:** OPEN
**Last review:** 2026-09-02 — still open; keep as merge playbook until encoded in sync-kingdom skill
**Date:** 2026-08-24
**Session context:** Merge origin/cursor/live-training-wandb-73ce into Mac Kingdom main
**Skill:** sync-kingdom
**Type:** internal
**Phase/Area:** Merge Mac orchestrator vs cloud feature branches

**Issue:** The live W&B branch reintroduced tab `useState`, VentureBoard+onUpdate, a single-file FleetGraph, and a Storage nav item. Mac Kingdom already uses OrchestratorContext, VentureSidebar/VenturePage, and FleetGraph/. Naive merge conflict resolution that takes “theirs” for App.tsx would wipe the orchestrator shell.

**Suggested improvement:** When merging cloud/Cursor feature branches into Kingdom, keep ours for App.tsx and VentureBoard; fold the feature into ResearchLab + a Vite middleware (or vite-plugins) that serves `/live/...`. Drop incoming files that collide with Mac folders (FleetGraph.tsx vs FleetGraph/).

**Principle:** Feature branches based on an older UI shell should land as plugins and leaf components, not as a replacement App router.

### Observation 12: CICStep Comic week can hide 2B if you only read v2a

**Status:** ACTIONED (2026-09-02) — folded into cicstep-weekly (scan Comic git + v2a/v2b program JSON)
**Date:** 2026-08-28
**Session context:** CICStep weekly for Aug 21–28 from Kingdom + git
**Skill:** New skill candidate: cicstep-weekly (internal)
**Type:** internal
**Phase/Area:** Venture coverage / Comic program files

**Issue:** Comic STATUS still headlines Version 2A (A1 passed, A2 pending). This week's Comic git is Version 2B (B0–B6 + G1). A CICStep pass that only reads v2a_program.json or the 2A STATUS block would report "no Comic work" or last week's storyboard freeze.

**Suggested improvement:** For weekly CICStep, scan Comic git since the window start and both v2a_program.json and v2b_program.json. Treat parallel programs as separate agents/tracks. Do not use "next pending on 2A" as evidence 2B did not ship.

**Principle:** Parallel product tracks need dated git/program logs per track; the headline STATUS line is not the week's work.

### Observation 13: Resume rating guide accelerates user-blocked phase

**Status:** ACTIONED (2026-09-02) — RATING_GUIDE.md already at ~/Projects/resume/knowledge/; Kingdom Resume panel Rating guide + wiki resume-master-knowledge link
**Date:** 2026-09-02
**Session context:** Master resume goal — infra complete, 10/81 rated on disk, blocked on user ratings + LinkedIn
**Skill:** sync-kingdom / resume-master-knowledge
**Type:** internal
**Phase/Area:** Resume dashboard rating workflow

**Issue:** After summary/skills rated, user faces 66 experience/project bullets with no prioritized view. Eval consensus and role-suggestions exist but were not surfaced in one scannable doc or Kingdom panel link.

**Suggested improvement:** RATING_GUIDE.md + Kingdom panel "Rating guide" button; keep GOAL_CHECKLIST linked. Goal remains blocked until user Syncs real ratings — never auto-fill ratings.json.

**Principle:** When a pipeline blocks on human approval, ship decision-support artifacts (ranked picks, role-lens stars) that reduce cognitive load without faking the approval step.

## 2026-09-02

### Observation 14: Sync must refresh control surface + preserve STATUS tails

**Status:** ACTIONED (2026-09-02) — writeStatusMd preserves below `---`; sync-kingdom After-sync requires control-surface.json
**Date:** 2026-09-02
**Session context:** Kingdom fleet sync, restore virtual control plane, brain harness empty-model
**Skill:** sync-kingdom
**Type:** internal
**Phase/Area:** After sync (required) / writeStatusMd

**Issue:** Branch App.tsx had regressed off OrchestratorProvider while FleetStrip still required it, so Throne fleet controls were unwired. Separately, `writeStatusMd` rewrote Comic STATUS.md and deleted the parallel 2B section below the `---` separator. Sync also lacked a first-class control-surface artifact, so agents could treat ventures.json as "done" without refreshing the virtual control UI / harness.

**Suggested improvement:** Keep the new After-sync control-surface checklist in sync-kingdom; keep STATUS tail preservation in writeStatusMd; when App and orchestrator components diverge across branches, treat missing Provider wiring as a sync/UI regression check.

**Principle:** A sync that updates data files but leaves the control surface or durable STATUS annotations behind is incomplete — pair data writers with UI/harness refresh and non-destructive STATUS merges.

### Observation 15: AGENT_SKILL_MAP must include every agent

**Status:** ACTIONED (2026-09-02) — agent-dojo mapped in scripts/lib/skill-graph.mjs; venture:new checklist requires map entry
**Date:** 2026-09-02
**Session context:** skill-graph audit after sync
**Skill:** sync-kingdom
**Type:** open-source
**Phase/Area:** skill-graph.mjs AGENT_SKILL_MAP

**Issue:** agent-dojo had an empty skills array because it was missing from AGENT_SKILL_MAP, so the fleet/skill graph showed "No skill map" for BeamDojo while other agents were wired.

**Suggested improvement:** When adding a registry agent, require a corresponding AGENT_SKILL_MAP entry (or fail sync with a warning listing agents without skills).

**Principle:** Graph edges that are optional in code become silent disconnects in the UI — treat missing map rows as sync defects, not empty truth.


### Observation 16: Personal OS needs registry template + capability edges, not FSM-only framing

**Status:** ACTIONED (2026-09-02) — venture-template.json + kingdom-personal-os / onboard docs + capability edges on sync
**Date:** 2026-09-02
**Session context:** Kingdom brain personal-OS architecture research + lean harness upgrade
**Skill:** sync-kingdom / kingdom-wiki
**Type:** internal
**Phase/Area:** harness schema / venture onboarding

**Issue:** Framing brain/harness as an FSM/KG toy undersells the real stack (wiki + skills + registry + Throne). Future projects had no empty-but-real onboarding schema, so each new venture reinvented wiring. Capability surfaces (dashboard/tests/research) existed in registry fields but not as typed graph nodes.

**Suggested improvement:** Keep `config/venture-template.json` + control-surface `onboarding` pointer; document [[kingdom-personal-os]] / [[onboard-new-project]]; emit capability edges on sync. Optionally fail/warn when AGENT_SKILL_MAP misses a registry agent (ties to obs 15).

**Principle:** A personal multi-app OS needs a portable plug-in contract (venture + skills + capabilities + sync/control actions) alongside compiled knowledge — state machines alone are insufficient, and vector RAG alone cannot own fleet topology.

### Observation 17: Compiled-wiki CLI makes personal OS operable day-to-day

**Status:** ACTIONED (2026-09-02) — npm brain:lint|query|ingest + playbook; architecture/experiments catalogued
**Date:** 2026-09-02
**Session context:** Upgrade Kingdom brain into serious Karpathy personal OS (lint/query/ingest + venture:new + Throne chips)
**Skill:** kingdom-wiki / sync-kingdom
**Type:** open-source
**Phase/Area:** brain/harness toolchain + AGENTS operations

**Issue:** AGENTS.md described ingest/query/lint as agent-only prose workflows. Without deterministic CLIs, health checks and index-first search depended on chat discipline and drifted (architecture/experiments pages missing from index for months).

**Suggested improvement:** Keep `npm run brain:lint|query|ingest` as first-class ops beside kingdom-wiki skill modes; treat post-sync `brain:lint` as optional hygiene in sync-kingdom; catalog architecture/experiments in index on onboard.

**Principle:** A compiled wiki is only as serious as its mechanical lint/query surface — schema prose without runnable health checks decays into an unmaintained markdown pile.

### Observation 18: Lint venture_id must scope to ventures/ only

**Status:** ACTIONED (2026-09-02) — lint.mjs duplicate venture_id scoped to ventures/; satellites checked separately
**Date:** 2026-09-02
**Session context:** Goal: lint heuristic v1 + semi-auto ingest after merging personal OS to main
**Skill:** kingdom-wiki
**Type:** open-source
**Phase/Area:** brain/harness/lint.mjs heuristics

**Issue:** First pass warned on duplicate `venture_id` across ventures/ + architecture/ + experiments/ for the same id. That pattern is intentional (three pages per venture), so the heuristic was noisy false positive and trained people to ignore lint.

**Suggested improvement:** Scope duplicate-`venture_id` warnings to `ventures/` only; keep path/`venture_id` mismatches and architecture|experiments satellites without a matching `ventures/<id>.md` as separate cheap signals. Document heuristic v1 ≠ contradiction engine in README/playbook.

**Principle:** Structural linters must encode the wiki’s real page-type conventions — treating intentional multi-page venture triples as duplicates destroys trust in health checks.

### Observation 19: Lint v2 + ingest extract shipped in same goal pass

**Status:** ACTIONED (2026-09-02) — lint.mjs: exclude live-tracker lifecycle scrape; tighter status-cell phrases; skip path-stub claims; wiki-link-only log lag; kingdom-wiki reports v2 warnings as non-judge
**Date:** 2026-09-02
**Session context:** Formal goal: hygiene + lint v2 + ingest extract + commit/push
**Skill:** kingdom-wiki
**Type:** open-source
**Phase/Area:** brain/harness lint/ingest

**Issue:** Status-phrase and log-lag heuristics produce useful review prompts but also false positives (e.g. "active" on live-tracker vs "parked" elsewhere; short path-like bullets counted as claims). Agents may treat warnings as defects to mass-edit.

**Suggested improvement:** In kingdom-wiki lint mode, tell agents to report v2 warnings first and only fix broken links / missing updated unless asked. Optionally add allowlist for live-tracker lifecycle scrape or raise claim bullet min length.

**Principle:** Cheap contradiction heuristics must stay warnings with an explicit "not a judge" framing, or noise trains people to ignore health checks.
