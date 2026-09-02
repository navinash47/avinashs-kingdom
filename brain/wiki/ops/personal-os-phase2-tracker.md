---
type: overview
updated: 2026-09-02
tags: [ops, personal-os, phase2, tracker]
---

# Personal OS Phase 2 — progress tracker

Temporary live board for the hard ~10%. SRS: [[concepts/personal-os-phase2-srs]]. Prompt: [[ops/personal-os-phase2-builder-prompt]].

**Overall:** `25%` · **Current step:** `W1 done — starting W2` · **Branch:** `main` · **Last update:** `2026-09-02`

| Workstream | Status | % | Evidence / SHA | Notes |
|------------|--------|---|----------------|-------|
| W0 SRS + builder prompt + this tracker | **done** | 100 | design files on disk | — |
| W1 Obs 11 merge playbook | **done** | 100 | see session log / commit SHA after push | sync-kingdom + ops playbook + Obs 11 ACTIONED |
| W2 LLM contradiction judge | pending | 0 | — | After W1 |
| W3 Full auto wiki | pending | 0 | — | After W2 |
| W4 MCP per app (pilot + template) | pending | 0 | — | After W3 |

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
- [ ] CLI + npm script (dry-run default)
- [ ] Report artifact path
- [ ] Docs vs heuristic lint v2
- [ ] Fixture / golden example
- [ ] Optional gated `--apply`

### W3 — Full auto wiki
- [ ] Inbox batch/watch command
- [ ] Draft vs published gate
- [ ] Idempotent re-run
- [ ] Lint (+ optional judge) before promote
- [ ] Playbook updated

### W4 — MCP per app
- [ ] Server template
- [ ] Registry / control-surface hook
- [ ] Pilot `get_status` (and phases/capabilities)
- [ ] Onboard-new-project MCP section
- [ ] Read-only before write tools

## Blockers

_None yet._

## Session log (append)

| Date | Step | What happened |
|------|------|----------------|
| 2026-09-02 | W0 | Created SRS, builder prompt, tracker, plan. Phase 2 implementation not started. |
| 2026-09-02 | W1 | Encoded Obs 11 into sync-kingdom + [[ops/cloud-ui-merge-playbook]]; mirrored ~/.cursor; Obs 11 ACTIONED. |
