---
type: overview
updated: 2026-09-02
tags: [ops, personal-os, phase2, prompt]
---

# Personal OS Phase 2 - builder prompt (paste into Agent / `/goal`)

Copy everything inside the fenced block when starting implementation. Keep this file as the canonical prompt; update the [[ops/personal-os-phase2-tracker]] after each workstream.

```text
You are implementing Kingdom Personal OS Phase 2 (the hard ~10%) in
/Users/avinashnandyala/Projects/avinashs-kingdom on branch main (or a feature
branch that merges cleanly to main).

## Authority (read first)
- SRS: brain/wiki/concepts/personal-os-phase2-srs.md
- Tracker: brain/wiki/ops/personal-os-phase2-tracker.md ← update every step
- Phase 1 architecture: brain/wiki/concepts/kingdom-personal-os.md
- Schema: brain/AGENTS.md
- Skills: sync-kingdom, kingdom-wiki, task-observer, kingdom-tunnels
- Obs 11 detail: brain/skill-observations/log.md (Observation 11)

## Mission
Ship four workstreams ONE BY ONE (do not parallel-ship W2–W4 until W1 is
accepted). After each workstream: verify acceptance criteria in the SRS,
update the tracker (status, %, evidence, SHA), append wiki/log.md, commit,
and push (no force). Do not mark Phase 2 complete until all W1–W4 pass.

## Workstream order
W1 Obs 11 merge playbook to W2 Large Language Model contradiction judge to W3 full auto wiki to W4 MCP per app (pilot then template).

## Hard constraints
- Raw files under brain/raw/ are immutable after filing.
- Heuristic brain:lint stays; Large Language Model judge is additive and default dry-run.
- Auto-wiki produces drafts; human/explicit approve promotes to published.
- MCP: read-only tools first; never expose .env/secrets/weights.
- Merging cloud UI branches: KEEP Mac OrchestratorProvider shell
 (App.tsx, VentureSidebar/VenturePage, FleetGraph/ dir). Land features as
 plugins / ResearchLab / Vite /live middleware - never replace the App router
 with an older useState tab shell.
- No secrets in brain/. Follow Comic OmniRoute rule only if touching that repo
 (text via OmniRoute; images direct) - Kingdom Phase 2 is mostly local Node.
- Prefer extending brain/harness/, .cursor/skills/, config/, Throne - do not
 invent a parallel OS.

## Per-workstream definition of done (must match SRS)
W1: sync-kingdom skill + ops playbook encode merge rules; obs 11 ACTIONED.
W2: npm script dry-run report under brain/harness/reports/; docs distinguish
 judge vs lint v2; optional --apply gated.
W3: inbox to one command to draft source + index/log proposal; promote gated;
 idempotent; lint (+ optional judge) before publish.
W4: MCP template + registry hook; get_status/get_phases/list_capabilities for
 ≥1 pilot venture; onboard doc updated.

## Progress protocol
1. Set tracker current_step to the workstream you start.
2. Check boxes / fill evidence as you go.
3. If blocked, write blocker on tracker; do not silently shrink scope.
4. End-of-session: commit tracker + code; report % and next step to the human.

## First concrete action when this prompt starts
Open the tracker, set W1 to in_progress, implement W1 fully, verify, then stop
and report before starting W2 unless the human said “do all Phase 2”.
```

## How to use

1. Open a new Agent chat (or `/goal` with: “Execute Phase 2 builder prompt”).
2. Paste the fenced prompt (or say “follow `brain/wiki/ops/personal-os-phase2-builder-prompt.md`”).
3. Watch [[ops/personal-os-phase2-tracker]] for step / %.

## Related

- [[concepts/personal-os-phase2-srs]] · [[ops/personal-os-phase2-tracker]] · [[ops/personal-os-playbook]]
