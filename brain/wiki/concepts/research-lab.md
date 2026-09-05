---
type: concept
updated: 2026-08-24
tags: [research, orchestrator, lab]
---

# Research Lab

Kingdom has a **Research** tab (not only cash ventures). Future papers, GPU runs, and lab notes land here as their own research project - do not jam them into Research Frontier if they are a different field.

## How to add a research project

1. Create (or clone) a repo with STATUS.md and optional + `proofs/*.mp4`.
2. Register it in with `"kind": "research"` and a field (e.g. `robot learning`, `Natural Language Processing`, graphics).
3. Add wiki pages: `brain/wiki/ventures/<id>.md`, `architecture/<id>.md` (include a mermaid file graph), `experiments/<id>.md`.
4. Seed a row in + if it has an agent.
5. Run. The Research tab reads.

## Live training (Weights & Biases)

Lambda has **no public Isaac webpage**. The browser UI for live metrics is **Weights & Biases**.

1. GPU box writes (gitignored). Schema:.
2. Kingdom copies that object onto the research project as training in.
3. Research tab to **Live training** card: status badge (idle / running / unknown) + **Open Weights & Biases**.
4. If wandb_entity is missing, the link is `https://wandb.ai`. After `wandb login` on the GPU box, open project **beamdojo**. Do not invent a run URL.
5. TensorBoard is SSH-only: `ssh -L 6006:localhost:6006 lambda-beamdojo`, then TensorBoard on.
6. Research tab polls every 5s in (reads the gitignored BeamDojo file) and after sync.
7. Missing live JSON to unknown/idle. Never claim a 10k-iter train is running.

## Rules for GPU / trained models

- Proof videos (small mp4) **do** go in git under `proofs/` and Kingdom.
- Checkpoints **do not**. After any train, tell Avinash the NFS/local path so he can copy them as insurance.
- GPU spend must be a JSONL row (actual_usd) so the expenses ledger stays honest.

## Current projects

| Id | Field | Repo |
|----|-------|------|
| research-frontier | generative comics / multimodal consistency | ~/Projects/research-frontier-lab |
| beamdojo | robot learning / humanoid locomotion | ~/Projects/BeamDojo |

Panel: http://127.0.0.1:5173/?tab=research
