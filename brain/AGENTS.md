# Kingdom Brain — Wiki Schema

Persistent knowledge base for Avinash’s Kingdom. The agent maintains this wiki; the human curates sources and asks questions.

**Vault root:** `/Users/avinashnandyala/Projects/avinashs-kingdom/brain`

## Layers

1. **raw/** — Immutable sources. Never edit filed sources; only add. Use `raw/inbox/` for new drops; move to `raw/research/` or `raw/ventures/` when processed.
2. **wiki/** — LLM-maintained Markdown. Interlinked pages, summaries, claims, gaps.
3. **This file (schema)** — Conventions and workflows. Co-evolve with use.

## Page types

| Type | Path | Purpose |
|------|------|---------|
| Overview | `wiki/overview.md` | Citizens’ map + portfolio |
| Ops | `wiki/ops/` | Steward dashboards (disk, subs) |
| Index | `wiki/index.md` | Catalog of every page (one-line summary each) |
| Log | `wiki/log.md` | Append-only timeline |
| Venture | `wiki/ventures/<id>.md` | One page per Kingdom venture |
| Concept | `wiki/concepts/<slug>.md` | Ideas, patterns, decisions |
| Entity | `wiki/entities/<slug>.md` | People, orgs, tools, papers-as-entities |
| Source | `wiki/sources/<slug>.md` | Summary of one ingested source |

Use Obsidian-style `[[wiki-links]]` between pages. Prefer relative paths from the page.

## Frontmatter (recommended)

```yaml
---
type: venture|concept|entity|source|overview
updated: YYYY-MM-DD
tags: []
---
```

## Operations

### Toolchain (deterministic)

| Command | Purpose |
|---------|---------|
| `npm run brain:lint` | Orphans, broken `[[links]]`, missing index rows |
| `npm run brain:query -- <terms>` | Keyword search over compiled wiki |
| `npm run brain:ingest` | List raw inbox / scaffold source page + print AGENTS checklist |
| `npm run brain:harness -- list` | Query sync-owned KG/FSM (`capabilities`, `neighbors`, …) |
| `npm run venture:new -- --id … --repo … --agent …` | Dry-run onboard from `venture-template.json` (`--write` to apply) |
| `npm run sync` | Refresh Throne control surface + harness graph |

Scripts live under `brain/harness/` (lint, wiki-query, ingest, query) and `scripts/new-venture.mjs`.

### Ingest

1. Place or fetch source into `raw/inbox/` (or `raw/research/` for papers). Optional: `npm run brain:ingest -- --file <path> --scaffold`.
2. Read the source. Do not modify the raw file after filing.
3. Write `wiki/sources/<slug>.md` (summary, key claims, limitations, links).
4. Update related venture / concept / entity pages (create if missing).
5. Update `wiki/index.md`.
6. Append to `wiki/log.md`:
   `## [YYYY-MM-DD] ingest | Title`
7. Prefer one source per ingest pass unless the human asks for a batch.
8. Hygiene: `npm run brain:lint`.

### Query

1. Prefer `npm run brain:query -- <terms>` or read `wiki/index.md` first, then drill into relevant pages.
2. Answer with citations (page paths). Prefer wiki over re-deriving from raw unless raw is needed.
3. File valuable answers back as `wiki/concepts/` or venture notes when the human agrees (or when clearly durable).

### Lint

Run `npm run brain:lint` (or `node brain/harness/lint.mjs --strict`). Checks orphans, broken `[[links]]`, missing index entries. Report findings; fix only what the human approves unless they said “lint and fix”.

## Domain focus

- **Cash / WhatsApp:** India SMB, real-estate broker vertical, pilot outreach — do not invent US-entity pivots.
- **YouTube:** Anti-slop long-form; real clip provenance required.
- **Research:** First vertical = generative comics / multimodal consistency (Atlas). GPU locomotion = BeamDojo (Dojo). Future papers/GPU labs get their own `kind: research` registry row + Research tab — see [[wiki/concepts/research-lab]]. Abstracts + claims, not full-PDF dumps by default. **Never git-commit model weights**; tell Avinash the checkpoint path as insurance.
- **Portfolio weights:** Prefer Kingdom README / `wiki/overview.md` over chat memory.

## Research Lab playbook

1. New research project → repo with `STATUS.md` (+ optional `tracking/expenses.jsonl`, `proofs/*.mp4`).
2. Register in `config/venture-registry.json` with `"kind": "research"` and a `field`.
3. Wiki: `ventures/`, `architecture/` (mermaid file graph), `experiments/` (include `Video: proofs/...` when a clip exists).
4. `npm run sync` from Kingdom. Panel: `/?tab=research`.
5. After a train: update STATUS + expenses; **do not** commit `.pt`. Tell the human to copy NFS checkpoints. Live metrics: Weights & Biases project `beamdojo` (Kingdom Research Lab card). TensorBoard only via SSH tunnel.
6. After a major chunk: commit and push the research repo **and** Kingdom (no secrets, no weights).
7. GPU box may write gitignored `tracking/training-status.json`. Sync attaches it as `training` on the Research Lab project. Missing file → idle/unknown; never invent a running job.

## Skills

Use Cursor skills: `kingdom-wiki`, `sync-kingdom`, `log-outreach`, `youtube-provenance`, `phase-gate`, `kingdom-tunnels`, `task-observer`.

## Personal OS (brain + skills + orchestrator + Throne)

Kingdom brain is a **reusable personal OS** for current and future projects — not an FSM/KG demo.

| Layer | Where |
|-------|--------|
| Durable instructions | this file + `wiki/` |
| Skills | Cursor skills (`kingdom-wiki`, `sync-kingdom`, …) |
| Project plug-in | `config/venture-registry.json` + `config/venture-template.json` + `npm run venture:new` |
| Typed world model / control contract | `brain/harness/` (KG + FSM slice) |
| Compiled-wiki toolchain | `brain:lint` / `brain:query` / `brain:ingest` |
| One-pane UI | panel `/?tab=throne` |

Architecture: [[wiki/concepts/kingdom-personal-os]].  
Daily ops: [[wiki/ops/personal-os-playbook]].  
Onboard a venture: [[wiki/concepts/onboard-new-project]].

## Harness (deterministic KG / FSM)

`brain/harness/` holds the empty-model graph + control FSM (orchestrator contract, not the whole OS) **and** the wiki compile toolchain (`lint.mjs`, `wiki-query.mjs`, `ingest.mjs`). Every `npm run sync` refreshes `empty-model/graph.json`, `empty-model/fsm.json`, and `public/data/control-surface.json` (includes `onboarding.template`). Query harness with `npm run brain:harness -- list`. See [[wiki/concepts/brain-harness-fsm]] and [[wiki/concepts/virtual-control-surface]].

## Secrets

Never put API keys, `.env` contents, or personal contact phone/email dumps into the wiki. Contact tracking stays in venture outreach tools.
