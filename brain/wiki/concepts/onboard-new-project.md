---
type: concept
updated: 2026-09-02
tags: [onboarding, registry, orchestrator, throne]
---

# Onboard a new project into brain + orchestrator + Throne

Use this whenever a future venture should appear in the Kingdom OS - not only research/Finite State Machine demos.

**Template (empty-but-real):** 
**Architecture:** [[kingdom-personal-os]]

## Checklist

1. **Repo exists** with at least STATUS.md (add / expenses when useful). No secrets in Kingdom brain.
2. **Template to registry** (pick one):
 - **CLI (preferred):** 
 
 Dry-run without --write. With --write: appends registry row + wiki stubs.
 - **Manual:** Open to add filled object to to `ventures[]`. 
 Set id, repoPath, agentId, wiki paths, paths, optional dashboard / github / tests / `kind: research`.
3. **Skill map** - add the new agentId to AGENT_SKILL_MAP in (at least sync-kingdom). Missing row = empty UI edge.
4. **Brain wiki** (kingdom-wiki ingest style; CLI stubs help but still update catalog): 
 - `wiki/ventures/<id>.md` 
 - `wiki/architecture/<id>.md` 
 - `wiki/experiments/<id>.md` 
 - Update + append 
 - Update [[where-files-live]] path map.
5. **sync-kingdom skill** - if the project lives outside the existing path table, add a row in the skill’s “Where each project actually lives” table (and backup under if you keep that mirror).
6. **Sync** from Kingdom with full filesystem access:
 ```bash
 cd ~/Projects/avinashs-kingdom && npm run sync && npm run brain:lint
 ```
7. **Verify one pane** 
 - `/?tab=throne` - venture in control surface + onboard/capability chips 
 - Graph / fleet map - `venture:<id>` node 
 - 
 - Research tab only if `kind: research`.

## Optional MCP (Phase 2b fleet)

Per-venture tools via. Registry:. Cursor:. Docs:. SRS: [[personal-os-phase2b-srs]].

**Read (always):** get_status, get_phases (or N/A), list_capabilities. 
**Write (gated):** append_log, trigger_sync - require `KINGDOM_MCP_WRITES=1`. Never.env/secrets/weights.

1. Add a server row to with venture_id + KINGDOM_VENTURE_ID.
2. Set `"mcp": { "id": "mcp-<id>", "enabled": true, "read_only": true }` on the venture registry row.
3. Add the server to (absolute path to venture-server.mjs).
4. Smoke: or fleet:.
5. - Throne control-surface includes `mcp.servers[]` with `health: configured`.

**Do not** expose.env, secrets, or weights via MCP.


## What sync must refresh

Per [[virtual-control-surface]]: control-surface.json, harness graph.json + fsm.json, ventures/skill-graph, and onboarding.template pointer to the venture template.

## Do not

- Hand-edit harness JSON outputs.
- Put.env / contact dumps in `brain/`.
- Commit model weights for GPU labs.
- Skip AGENT_SKILL_MAP “because sync will invent it.”

## Related

- [[kingdom-personal-os]]
- [[ops/personal-os-playbook]]
- [[brain-harness-fsm]]
- [[research-lab]] (research-kind variant)
- Skill: sync-kingdom
