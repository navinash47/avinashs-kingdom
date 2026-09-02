---
type: concept
updated: 2026-09-02
tags: [architecture, personal-os, srs, phase2, mcp, wiki, lint]
---

# Personal OS Phase 2 — hard 10% (SRS / system design)

**Status:** Phase 2 implementation complete (W1–W4 acceptance green).  
**Parent OS:** [[kingdom-personal-os]] (Phase 1 done on `main`).  
**Builder prompt:** [[ops/personal-os-phase2-builder-prompt]].  
**Live tracker:** [[ops/personal-os-phase2-tracker]].  
**Merge playbook (W1):** [[ops/cloud-ui-merge-playbook]].  
**MCP:** `mcp/README.md` · `config/mcp-registry.json`  
**Plan mirror:** `.cursor/plans/personal_os_phase2_hard10.plan.md`

## Problem

Phase 1 gives a usable personal OS (sync, Throne, wiki lint/query/ingest, venture onboard). The remaining ~10% is the **hard layer**: deeper automation and control without breaking the Karpathy compile model or the Mac orchestrator shell.

## Goals

1. **Full auto wiki** — inbox/raw drops become reviewed wiki pages with less chat babysitting (pipeline + gates, not silent hallucinated rewrites).
2. **MCP per app** — each venture exposes tools so the orchestrator/agent can inspect and act across the fleet from one place.
3. **LLM contradiction judge** — optional LLM pass over heuristic lint warnings / claim sets; human still approves material wiki edits.
4. **Obs 11 merge playbook** — encode “keep Mac App/orchestrator; land cloud features as plugins” into sync-kingdom (and a short ops playbook).

## Non-goals (Phase 2)

- Replacing `brain/` with vector-RAG-only memory.
- Force-pushing or rewriting `main` history.
- Committing secrets, weights, or contact dumps.
- One mega-MCP that bypasses per-venture STATUS/phases sources of truth.

## Order of work (one by one)

| # | Workstream | Why this order |
|---|------------|----------------|
| W0 | Tracker + this SRS + builder prompt | Alignment before code |
| W1 | Obs 11 merge playbook | Smallest hard item; protects shell while building rest |
| W2 | LLM contradiction judge | Extends existing `brain:lint`; lower infra than MCP |
| W3 | Full auto wiki pipeline | Needs judge + clear review gates |
| W4 | MCP per app | Largest; depends on stable OS contract + skills |

## Architecture sketch

```
raw/inbox ──► auto-ingest worker ──► wiki stubs + proposed patches
                      │                      │
                      ▼                      ▼
              brain:lint (v2) ──► llm-judge ──► human approve ──► wiki/
                      │
                      ▼
         sync-kingdom ──► control-surface + Throne
                      │
         MCP servers (per venture) ◄── Cursor / orchestrator tools
```

### Layer rules

| Layer | Owner | Must stay true |
|-------|--------|----------------|
| Raw | Immutable after file | Never edit filed sources |
| Wiki | Compiled truth | Human or approved agent only |
| Heuristic lint | Deterministic | Errors = broken links; warnings = review prompts |
| LLM judge | Advisory | Never auto-merge claim fixes without flag/`--apply` + log |
| Sync / Throne | Fleet snapshot | Still from STATUS/phases/registry |
| MCP | Tool I/O | Read STATUS/tracking; mutate only via documented safe tools |

## Workstream requirements

### W1 — Obs 11 merge playbook

**Requirements**

- R1.1 Document keep-ours list: `App.tsx`, OrchestratorProvider shell, `VentureSidebar`/`VenturePage`, `FleetGraph/` directory vs single-file.
- R1.2 Document fold-in pattern: Research Lab / Vite middleware `/live/...`; drop colliding leaf files.
- R1.3 Encode checklist into `.cursor/skills/sync-kingdom/SKILL.md` (+ `~/.cursor` mirror).
- R1.4 Short ops page + mark observation 11 ACTIONED when encoded.

**Acceptance**

- Agent reading sync-kingdom alone can merge a cloud UI branch without wiping OrchestratorContext.
- Obs 11 status ACTIONED with pointer to the playbook.

### W2 — LLM contradiction judge

**Requirements**

- R2.1 CLI e.g. `npm run brain:judge` (or `brain:lint --judge`) reading wiki + optional lint JSON.
- R2.2 Outputs structured report: claim A vs claim B, pages, severity, suggested resolution (not silent rewrite).
- R2.3 Default dry-run; `--apply` only writes to a proposals path or gated patches.
- R2.4 Uses OmniRoute/text LLM policy if project already routes coding LLMs that way; no image routing.
- R2.5 Docs: judge ≠ heuristic v2; both required in playbook.

**Acceptance**

- Dry-run on current wiki exits 0 and writes a report artifact under `brain/harness/reports/` (or similar).
- At least one synthetic conflict fixture test or documented golden example.

### W3 — Full auto wiki

**Requirements**

- R3.1 Watch or batch command: process `raw/inbox/*` → file raw → scaffold → LLM compile draft.
- R3.2 Always update index + log (or proposal thereof).
- R3.3 Review gate: `draft` vs `published` (frontmatter or `wiki/drafts/`).
- R3.4 Run heuristic lint (+ optional judge) before promoting draft → published.
- R3.5 Idempotent: re-running same raw does not duplicate sources.
- R3.6 Throne or ops note shows last auto-ingest status (optional but preferred).

**Acceptance**

- Dropping one markdown file in inbox + one command yields a draft source page + checklist/log line without a full manual chat.
- Promoting to published requires an explicit approve step.

### W4 — MCP per app

**Requirements**

- R4.1 MCP server template + registry row linking `venture_id` → MCP endpoint/command.
- R4.2 Minimum tools per venture: `get_status`, `get_phases` (or N/A), `list_capabilities`.
- R4.3 Safe write tools (optional phase 2b): `append_log`, `trigger_sync` — never raw `.env` read.
- R4.4 Document how Cursor connects; Throne lists MCP health if cheap.
- R4.5 Pilot 1–2 ventures (Kingdom ops + one cash/research) before fleet-wide.

**Acceptance**

- Cursor (or MCP inspector) can call `get_status` for the pilot venture and get live STATUS-derived JSON.
- Onboarding doc updated: new venture → optional MCP stub from template.

## Dependencies & risks

| Risk | Mitigation |
|------|------------|
| Auto-wiki invents facts | Drafts + judge + human promote |
| MCP over-permission | Read-only tools first |
| Merge playbook ignored | Skill-first encoding + obs ACTIONED |
| Judge cost/noise | Cap pages/tokens; only run on warn set |

## Evidence for “Phase 2 done”

All W1–W4 acceptance checks green; tracker 100%; builder prompt section “Definition of done” satisfied; wiki log entry closing Phase 2.

## Related

- [[llm-wiki]] · [[brain-harness-fsm]] · [[virtual-control-surface]] · [[onboard-new-project]] · [[ops/personal-os-playbook]]
