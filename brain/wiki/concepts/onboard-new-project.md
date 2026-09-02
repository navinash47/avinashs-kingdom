---
type: concept
updated: 2026-09-02
tags: [onboarding, registry, orchestrator, throne]
---

# Onboard a new project into brain + orchestrator + Throne

Use this whenever a future venture should appear in the Kingdom OS — not only research/FSM demos.

**Template (empty-but-real):** `config/venture-template.json`  
**Architecture:** [[kingdom-personal-os]]

## Checklist

1. **Repo exists** with at least `STATUS.md` (add `tracking/phases.json` / expenses when useful). No secrets in Kingdom brain.
2. **Template → registry** (pick one):
   - **CLI (preferred):**  
     `npm run venture:new -- --id <slug> --repo ~/Projects/<slug> --agent agent-<short> [--kind research] [--write]`  
     Dry-run without `--write`. With `--write`: appends registry row + wiki stubs.
   - **Manual:** Open `config/venture-template.json` → add filled object to `config/venture-registry.json` → `ventures[]`.  
   Set `id`, `repoPath`, `agentId`, wiki paths, `paths`, optional `dashboard` / `github` / `tests` / `kind: research`.
3. **Skill map** — add the new `agentId` to `AGENT_SKILL_MAP` in `scripts/lib/skill-graph.mjs` (at least `sync-kingdom`). Missing row = empty UI edge.
4. **Brain wiki** (kingdom-wiki ingest style; CLI stubs help but still update catalog):  
   - `wiki/ventures/<id>.md`  
   - `wiki/architecture/<id>.md`  
   - `wiki/experiments/<id>.md`  
   - Update `wiki/index.md` + append `wiki/log.md`  
   - Update [[where-files-live]] path map.
5. **sync-kingdom skill** — if the project lives outside the existing path table, add a row in the skill’s “Where each project actually lives” table (and backup under `brain/backup/cursor-skills/sync-kingdom/` if you keep that mirror).
6. **Sync** from Kingdom with full filesystem access:
   ```bash
   cd ~/Projects/avinashs-kingdom && npm run sync && npm run brain:lint
   ```
7. **Verify one pane**  
   - `/?tab=throne` — venture in control surface + onboard/capability chips  
   - Graph / fleet map — `venture:<id>` node  
   - `npm run brain:harness -- neighbors venture:<id>`  
   - Research tab only if `kind: research`.

## What sync must refresh

Per [[virtual-control-surface]]: `control-surface.json`, harness `graph.json` + `fsm.json`, ventures/skill-graph, and `onboarding.template` pointer to the venture template.

## Do not

- Hand-edit harness JSON outputs.
- Put `.env` / contact dumps in `brain/`.
- Commit model weights for GPU labs.
- Skip `AGENT_SKILL_MAP` “because sync will invent it.”

## Related

- [[kingdom-personal-os]]
- [[ops/personal-os-playbook]]
- [[brain-harness-fsm]]
- [[research-lab]] (research-kind variant)
- Skill: `sync-kingdom`
