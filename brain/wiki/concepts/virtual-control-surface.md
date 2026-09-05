---
type: concept
updated: 2026-09-02
tags: [orchestrator, sync, control, personal-os]
---

# Virtual control surface

The Kingdom panel **Throne** tab is the personal virtual control plane: fleet start/stop, sync, P0 shortcuts, skill/graph rollup - the one-pane UI of the [[kingdom-personal-os]].

## Rule (durable)

**Every `npm run sync` must refresh the control surface.**

Sync writes:

1. `public/data/ventures.json`, audits, manifests, skill-graph, research-lab (existing)
2. **`public/data/control-surface.json`** - Finite State Machine + venture/skill/capability summary + graph + **onboarding** (template pointer)
3. **`brain/harness/empty-model/graph.json` + `fsm.json`** - deterministic KG/Finite State Machine seed

Skill: **sync-kingdom** (After sync to control surface).

## Open

```bash
cd ~/Projects/avinashs-kingdom && npm run sync && npm run brain:lint && npm run dev
# to http://localhost:5173/?tab=throne
```

Throne **Virtual control** shows capability chips + onboard hint from `control-surface.json` (`onboarding`, capability graph nodes). ⌘K opens the command palette. Graph tab uses the React Flow fleet map. New project checklist: [[onboard-new-project]]. Daily: [[ops/personal-os-playbook]].

## Related

- [[kingdom-personal-os]]
- [[brain-harness-fsm]]
- [[where-files-live]]
- [[ops/live-tracker]]
- Venture: [[ventures/kingdom-ops]]
