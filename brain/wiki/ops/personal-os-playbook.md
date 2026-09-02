---
type: overview
updated: 2026-09-02
tags: [ops, personal-os, playbook]
---

# Personal OS — daily ops playbook

How Avinash runs the Kingdom **personal OS** day to day. Architecture: [[concepts/kingdom-personal-os]]. Schema: `brain/AGENTS.md`.

## Morning / context load (2–5 min)

1. Open Throne: `cd ~/Projects/avinashs-kingdom && npm run dev` → `/?tab=throne`
2. Glance **Virtual control**: sync stamp, FSM state, P0 strip, capability chips, onboard hint
3. If STATUS/phases changed overnight elsewhere: `npm run sync` (full filesystem access)
4. Optional hygiene: `npm run brain:lint`

## During work (any venture)

| Need | Do this |
|------|---------|
| Progress changed in a venture repo | Edit STATUS/phases/expenses there → `npm run sync` |
| Research / decision to keep | `npm run brain:ingest -- --file …` (stub + checklist) **or** `npm run brain:auto-wiki` (inbox → drafts) → review → `--promote <slug>` |
| Question against memory | `npm run brain:query -- <terms>` or skill query mode; cite `brain/wiki/…` |
| Topology / “what can I start?” | `npm run brain:harness -- list` · `capabilities` · `allow sync` |
| Phase close | **phase-gate** skill |
| Outreach / YouTube provenance | **log-outreach** / **youtube-provenance** |
| Multi-step session | **task-observer** → log to `brain/skill-observations/log.md` |

## End of day

1. Sync if anything panel-facing moved
2. `npm run brain:lint` if you ingested or touched many wiki links (heuristic v2: broken links = errors; stale/dupes/status-phrase/claim dupes = warnings)
3. Append wiki `log.md` only when an ingest/ops event happened (agents do this on ingest; `brain:ingest` prints the exact line)
4. Ask “any observations?” if the session was substantive

## Phase 2 (hard ~10% — when building next)

- SRS: [[concepts/personal-os-phase2-srs]]
- Paste prompt: [[ops/personal-os-phase2-builder-prompt]]
- Watch progress: [[ops/personal-os-phase2-tracker]]
- Cloud UI merges: [[ops/cloud-ui-merge-playbook]] (keep Mac orchestrator shell)

## Weekly

- Skim `wiki/log.md` last 7 entries: `grep "^## \[" brain/wiki/log.md | tail -10`
- Review OPEN skill observations when backlog is stale (`brain/skill-observations/`)
- Confirm Research Lab / GPU claims match `tracking/training-status.json` (never invent “running”)

## New project (mechanical)

`npm run venture:new -- --id <slug> --repo ~/Projects/<slug> --agent agent-<short> [--write]`  
Then finish checklist in [[concepts/onboard-new-project]].

## Commands cheat sheet

```bash
cd ~/Projects/avinashs-kingdom
npm run sync
npm run brain:lint
npm run brain:judge              # advisory contradictions → brain/harness/reports/ (dry-run)
npm run brain:judge:fixture     # golden synthetic conflict
npm run brain:auto-wiki         # inbox → drafts + proposals (idempotent)
npm run brain:auto-wiki -- --promote <slug>  # lint then publish
npm run mcp:smoke -- kingdom-ops
npm run brain:query -- personal OS
npm run brain:ingest -- --list
npm run brain:ingest -- --file brain/raw/inbox/<source>.md
npm run brain:harness -- list
npm run venture:new -- --id demo --repo ~/Projects/demo --agent agent-demo
```

`brain:lint` is **heuristic v2**. `brain:judge` is the **additive** contradiction judge. `brain:auto-wiki` is the **full auto** path (drafts under `wiki/drafts/`; explicit `--promote`). `mcp:smoke` verifies read-only venture MCP tools (`mcp/README.md`). `brain:ingest --file` remains the semi-auto single-file checklist path.

## Do not

- Hand-edit `brain/harness/empty-model/graph.json` / `fsm.json`
- Put secrets or contact dumps in `brain/`
- Commit model weights
- Treat chat as the durable store — file into wiki when it matters
- Expect `brain:lint` to fully judge claim truth (it won't — use review + query; v2 only flags cheap phrase/claim echoes)
