# Kingdom brain harness (empty model)

Lean **deterministic** knowledge-graph + FSM scaffold — not a neural model.
Own it, query it, extend it. Sync keeps the graph filled.

## Why

Brain wiki pages are prose. The panel is UI. This harness is the **typed empty model** that sits between them: nodes/edges + a control-plane state machine agents and scripts can query without LLM guesswork.

## Layout

```text
brain/harness/
  README.md                 ← this file
  query.mjs                 ← CLI: list / neighbors / path / fsm
  empty-model/
    graph.json              ← auto-filled by npm run sync
    fsm.json                ← auto-filled by npm run sync
    schema.md               ← node/edge/event types (hand-owned)
```

## How it harnesses brain + skills + apps

1. **Apps** register in `config/venture-registry.json` (ports, github, tests).
2. **`npm run sync`** refreshes `public/data/*` **and** rewrites `empty-model/graph.json` + `fsm.json`.
3. **Skills** (`sync-kingdom`, `phase-gate`, …) are edges on agent nodes in the graph.
4. **Brain wiki** explains *why*; the harness stores *what is connected* and *what state the control plane is in*.
5. **Virtual control UI** (Throne → Virtual control) reads `public/data/control-surface.json` — same sync pass.

## Query

```bash
cd ~/Projects/avinashs-kingdom
node brain/harness/query.mjs list
node brain/harness/query.mjs neighbors venture:whatsapp-voice
node brain/harness/query.mjs path hub:kingdom skill:sync-kingdom
node brain/harness/query.mjs fsm
node brain/harness/query.mjs allow sync
```

## Ownership rule

- Edit **schema.md** and this README by hand.
- Do **not** hand-edit `graph.json` / `fsm.json` — they are sync outputs (like live-tracker).
- After registry / skill-map changes: `npm run sync`.

## Related

- [[wiki/concepts/virtual-control-surface]]
- [[wiki/concepts/brain-harness-fsm]]
- Skill: `sync-kingdom`
