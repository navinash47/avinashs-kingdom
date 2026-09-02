---
type: overview
updated: 2026-09-02
tags: [ops, personal-os, phase2, tracker]
---

# Personal OS Phase 2 — progress tracker

Temporary live board for the hard ~10%. SRS: [[concepts/personal-os-phase2-srs]]. Prompt: [[ops/personal-os-phase2-builder-prompt]].

**Overall:** `100%` · **Current step:** `Phase 2 complete` · **Branch:** `main` · **Last update:** `2026-09-02`

| Workstream | Status | % | Evidence / SHA | Notes |
|------------|--------|---|----------------|-------|
| W0 SRS + builder prompt + this tracker | **done** | 100 | design files on disk | — |
| W1 Obs 11 merge playbook | **done** | 100 | `c2df411` | sync-kingdom + ops playbook + Obs 11 ACTIONED |
| W2 LLM contradiction judge | **done** | 100 | `4e95d71` | `brain:judge` + fixture + reports/ |
| W3 Full auto wiki | **done** | 100 | `20df245` | `brain:auto-wiki` draft→promote |
| W4 MCP per app (pilot + template) | **done** | 100 | `b678d51` | kingdom-ops `mcp:smoke` + registry |

## Checklist detail

### W0 — Design pack
- [x] SRS (`concepts/personal-os-phase2-srs.md`)
- [x] Builder prompt (`ops/personal-os-phase2-builder-prompt.md`)
- [x] Tracker (this page)
- [x] Plan mirror (`.cursor/plans/personal_os_phase2_hard10.plan.md`)
- [x] Index + log links

### W1 — Obs 11 merge playbook
- [x] sync-kingdom skill section: keep-ours / fold-in / drop-collisions
- [x] Ops playbook page for cloud→Mac merges (`ops/cloud-ui-merge-playbook.md`)
- [x] `~/.cursor/skills` mirror
- [x] Obs 11 → ACTIONED with pointer
- [x] Verified: written checklist is sufficient without chat memory

### W2 — LLM contradiction judge
- [x] CLI + npm script (dry-run default) — `npm run brain:judge`
- [x] Report artifact path — `brain/harness/reports/`
- [x] Docs vs heuristic lint v2 — harness README + playbook + kingdom-wiki
- [x] Fixture / golden example — `npm run brain:judge:fixture`
- [x] Optional gated `--apply` — proposals only

### W3 — Full auto wiki
- [x] Inbox batch/watch command — `npm run brain:auto-wiki` (+ `--watch`)
- [x] Draft vs published gate — `wiki/drafts/` → `--promote`
- [x] Idempotent re-run — content-hash state
- [x] Lint (+ optional judge) before promote
- [x] Playbook updated

### W4 — MCP per app
- [x] Server template — `mcp/venture-server.mjs`
- [x] Registry / control-surface hook — `config/mcp-registry.json` + sync `mcp` snapshot
- [x] Pilot `get_status` (and phases/capabilities) — kingdom-ops via `npm run mcp:smoke`
- [x] Onboard-new-project MCP section
- [x] Read-only before write tools

## Blockers

_None._

## Session log (append)

| Date | Step | What happened |
|------|------|----------------|
| 2026-09-02 | W0 | Created SRS, builder prompt, tracker, plan. Phase 2 implementation not started. |
| 2026-09-02 | W1 | Encoded Obs 11 into sync-kingdom + [[ops/cloud-ui-merge-playbook]]; mirrored ~/.cursor; Obs 11 ACTIONED. SHA `c2df411`. |
| 2026-09-02 | W2 | Shipped `brain:judge` (dry-run reports, offline/LLM, `--apply` proposals, fixture golden). SHA `4e95d71`. |
| 2026-09-02 | W3 | Shipped `brain:auto-wiki` (drafts, promote gate, idempotent, lint-before-publish). SHA `20df245`. |
| 2026-09-02 | W4 | Shipped venture MCP template + kingdom-ops pilot; control-surface MCP health; onboard docs. Phase 2 = 100%. |
