# Kingdom brain harness — personal OS contract

Lean **deterministic** project registry + orchestrator contract (typed KG + control FSM)
**plus** Karpathy compiled-wiki toolchain (lint / query / ingest stubs).
Not a neural model. Not an FSM-only toy. Own it, query it, plug future ventures into it.

## Why this exists

| Without harness | With harness |
|-----------------|--------------|
| Brain wiki is prose only | Typed *what is connected* + real lint/query commands |
| Throne is UI-only | Sync-owned control snapshot agents can query |
| Each new app reinvented | Registry + template + `venture:new` = plug-in contract |
| Pure vector RAG | Compiled wiki + deterministic edges beat re-retrieval for a personal fleet |
| Pure FSM | FSM alone can’t hold durable instructions or skills |

**Personal OS stack:** brain (`AGENTS.md` + wiki) → skills → registry/harness → sync → Throne.

## Layout

```text
brain/harness/
  README.md                 ← this file
  query.mjs                 ← KG/FSM CLI: list / neighbors / path / fsm / capabilities
  lint.mjs                  ← wiki health: broken links, missing index, orphans
  wiki-query.mjs            ← keyword search over compiled wiki
  ingest.mjs                ← raw inbox list / source scaffold + AGENTS checklist
  empty-model/
    graph.json              ← auto-filled by npm run sync
    fsm.json                ← auto-filled by npm run sync
    schema.md               ← node/edge/sync/control contract (hand-owned)
```

Related repo roots (not under harness, but part of the OS):

- `config/venture-registry.json` — live ventures
- `config/venture-template.json` — empty-but-real future project schema
- `scripts/new-venture.mjs` — mechanical onboard CLI
- `public/data/control-surface.json` — Throne + agent snapshot
- `brain/wiki/` — compiled knowledge
- `brain/raw/` — immutable sources

## How it harnesses brain + skills + apps

1. **Apps** register in `config/venture-registry.json` (ports, github, tests, optional capabilities).
2. **`npm run sync`** refreshes `public/data/*` **and** rewrites `empty-model/graph.json` + `fsm.json` + control-surface (including onboarding template pointer).
3. **Skills** (`sync-kingdom`, `phase-gate`, …) are edges on agent nodes.
4. **Brain wiki** explains *why*; lint/query keep it healthy; harness stores *what is connected*.
5. **Throne** (`/?tab=throne`) is the one-pane control surface.

Architecture: [[wiki/concepts/kingdom-personal-os]].  
Daily ops: [[wiki/ops/personal-os-playbook]].  
Onboard: [[wiki/concepts/onboard-new-project]].

## Commands

```bash
cd ~/Projects/avinashs-kingdom

# Compiled wiki
npm run brain:lint
npm run brain:query -- personal OS
npm run brain:ingest -- --list

# Harness KG / FSM
npm run brain:harness -- list
npm run brain:harness -- capabilities
npm run brain:harness -- neighbors venture:whatsapp-voice
npm run brain:harness -- path hub:kingdom skill:sync-kingdom
npm run brain:harness -- fsm
npm run brain:harness -- allow sync

# Onboard
npm run venture:new -- --id demo --repo ~/Projects/demo --agent agent-demo
```

After sync that touches wiki structure: run `npm run brain:lint` as hygiene.

## Ownership rule

- Edit **schema.md** and this README by hand.
- Edit **venture-template.json** / registry by hand (or via `venture:new --write`) when plugging projects.
- Do **not** hand-edit `graph.json` / `fsm.json` — they are sync outputs.
- After registry / skill-map changes: `npm run sync`.
