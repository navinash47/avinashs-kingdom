---
type: architecture
venture_id: kingdom-ops
updated: 2026-08-24
---

# Kingdom ops architecture

## System design

React + Vite command orchestrator with local control API (:5174). `npm run dev` starts UI + API. Venture **Run** tabs embed live dashboards and expose Start/Stop/Test/Sync buttons. `npm run sync` pulls venture data into `public/data/`.

## Input / output flows

```mermaid
flowchart LR
  subgraph in [Inputs]
    STATUS[STATUS.md]
    Phases[phases.json]
    Wiki[brain/wiki]
    Repos[sibling repos]
  end
  subgraph sync [sync-kingdom.mjs]
    Census[census.mjs]
    Arch[architecture.mjs]
    Cicd[cicd.mjs]
  end
  subgraph out [Outputs]
    Panel[public/data JSON]
    UI[Kingdom panel UI]
  end
  Repos --> Census
  Wiki --> Arch
  STATUS --> sync
  Phases --> sync
  sync --> Panel --> UI
```

- **In:** sibling repo STATUS.md, phases.json, expenses.jsonl, registry paths, brain/wiki/architecture/*.md
- **Out:** ventures.json, manifests, architecture JSON, live-tracker.md, panel UI via fetch('/data/…')

## Data stores

| Store | Type | Path |
|-------|------|------|
| Panel seed | JSON | public/data/*.json |
| Manifests | JSON | public/data/manifests/ |
| Brain wiki | Markdown | brain/wiki/ |
| User edits | localStorage | avinash-kingdom-v4 |

## Key libraries

- React 19, Vite 8, TypeScript
- sync-kingdom.mjs orchestrator modules (census, architecture, health, cicd)

## Version history

- v1.0 — venture board + sync
- v2.1 — operational control plane (API, embedded dashboards, test runner)

## Future plans

- Raycast hotkey layer (optional)
- Agent trace tab (LangSmith-style)
- Auto-run local tests on sync (opt-in)

## Experiments log

See [[experiments/kingdom-ops]].
