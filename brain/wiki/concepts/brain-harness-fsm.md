---
type: concept
updated: 2026-09-02
tags: [brain, harness, fsm, knowledge-graph]
---

# Brain harness FSM / empty model

Deterministic knowledge-graph + control FSM under `brain/harness/`. Not a neural net — an **empty model** you fill via sync and own via schema.

## Use

```bash
node brain/harness/query.mjs list
node brain/harness/query.mjs neighbors venture:beamdojo
node brain/harness/query.mjs fsm
```

Schema: `brain/harness/empty-model/schema.md`. Full how-to: `brain/harness/README.md`.

## Sync contract

`scripts/lib/control-surface.mjs` runs at the end of `npm run sync` and rewrites graph + FSM. Hand-edits to those JSON files are overwritten.

## Related

- [[virtual-control-surface]]
- [[llm-wiki]]
- [[task-observer-headroom]]
