---
type: concept
updated: 2026-08-24
tags: [research, orchestrator, lab]
---

# Research Lab

Kingdom has a **Research** tab (not only cash ventures). Future papers, GPU runs, and lab notes land here as their own research project — do not jam them into Research Frontier if they are a different field.

## How to add a research project

1. Create (or clone) a repo with `STATUS.md` and optional `tracking/expenses.jsonl` + `proofs/*.mp4`.
2. Register it in `config/venture-registry.json` with `"kind": "research"` and a `field` (e.g. `robot learning`, `NLP`, `graphics`).
3. Add wiki pages: `brain/wiki/ventures/<id>.md`, `architecture/<id>.md` (include a mermaid file graph), `experiments/<id>.md`.
4. Seed a row in `public/data/ventures.json` + `public/data/agents.json` if it has an agent.
5. Run `npm run sync`. The Research tab reads `public/data/research-lab.json`.

## Rules for GPU / trained models

- Proof videos (small mp4) **do** go in git under `proofs/` and Kingdom `public/data/research/<id>/`.
- Checkpoints **do not**. After any train, tell Avinash the NFS/local path so he can copy them as insurance.
- GPU spend must be a JSONL row (`actual_usd`) so the expenses ledger stays honest.

## Current projects

| Id | Field | Repo |
|----|-------|------|
| `research-frontier` | generative comics / multimodal consistency | ~/Projects/research-frontier-lab |
| `beamdojo` | robot learning / humanoid locomotion | ~/Projects/BeamDojo |

Panel: http://127.0.0.1:5173/?tab=research
