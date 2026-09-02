---
type: concept
updated: 2026-09-02
tags: [orchestrator, sync, control]
---

# Virtual control surface

The Kingdom panel **Throne** tab is the personal virtual control plane: fleet start/stop, sync, P0 shortcuts, skill/graph rollup — not a separate product.

## Rule (durable)

**Every `npm run sync` must refresh the control surface.**

Sync writes:

1. `public/data/ventures.json`, audits, manifests, skill-graph, research-lab (existing)
2. **`public/data/control-surface.json`** — FSM + venture/skill summary + graph edges for the UI
3. **`brain/harness/empty-model/graph.json` + `fsm.json`** — deterministic KG/FSM seed

Skill: **sync-kingdom** (After sync → control surface).

## Open

```bash
cd ~/Projects/avinashs-kingdom && npm run sync && npm run dev
# → http://localhost:5173/?tab=throne
```

⌘K opens the command palette. Graph tab uses the React Flow fleet map.

## Related

- [[brain-harness-fsm]]
- [[where-files-live]]
- [[ops/live-tracker]]
- Venture: [[ventures/kingdom-ops]]
