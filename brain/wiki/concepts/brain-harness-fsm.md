---
type: concept
updated: 2026-09-02
tags: [brain, harness, fsm, knowledge-graph, personal-os]
---

# Brain harness Finite State Machine / empty model

Deterministic knowledge-graph + control Finite State Machine under `brain/harness/`. Not a neural net - the **typed world-model / orchestrator contract** slice of the Kingdom [[kingdom-personal-os]].

Node types include `venture`, `skill`, `capability`, `agent`, `orchestrator`. Schema: `brain/harness/empty-model/schema.md`.

## Use

```bash
node brain/harness/query.mjs list
node brain/harness/query.mjs neighbors venture:beamdojo
node brain/harness/query.mjs fsm
```

Full how-to: `brain/harness/README.md`. Future projects: [[onboard-new-project]].

## Sync contract

`scripts/lib/control-surface.mjs` runs at the end of `npm run sync` and rewrites graph + Finite State Machine + control-surface (`contract: kingdom-personal-os`, `onboarding.template`). Hand-edits to those JSON files are overwritten.

## Related

- [[kingdom-personal-os]]
- [[virtual-control-surface]]
- [[llm-wiki]]
- [[task-observer-headroom]]
