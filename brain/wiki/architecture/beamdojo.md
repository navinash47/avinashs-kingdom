---
type: architecture
venture_id: beamdojo
updated: 2026-08-24
---

# BeamDojo architecture

## System design

Mac is the orchestrator. Training and RTX video run on a Lambda **A10** (RT cores) inside Isaac Sim 5.1 + Isaac Lab 2.3.2 Docker. BeamDojo source is bind-mounted from NFS so terminate does not wipe code. Checkpoints stay on NFS. Kingdom syncs STATUS, expenses, proof mp4s, and into the Research Lab. Live curves are **Weights & Biases** (not an Isaac webpage).

```mermaid
flowchart LR
 Mac["Mac · BeamDojo repo + Kingdom"] -->|ssh / rsync| GPU["Lambda A10 · Isaac Sim Docker"]
 Train["scripts/rsl_rl/train_beamdojo.py"] --> Runtime["scripts/rsl_rl/beamdojo_runtime.py"]
 Runtime --> Cfg["h1_cfg/beamdojo_stage1_cfg.py"]
 Cfg --> Isaac["Isaac Lab + PhysX + RTX"]
 Isaac --> NFS["NFS logs / model_*.pt"]
 Train --> WB["Weights & Biases · project beamdojo"]
 Train --> Status["tracking/training-status.json"]
 Play["scripts/rsl_rl/play_beamdojo.py --video"] --> Proofs["proofs/*.mp4"]
 STATUS["STATUS.md + expenses.jsonl"] --> Sync["Kingdom npm run sync"]
 Status --> Sync
 Proofs --> Sync
 Sync --> Lab["Research Lab tab"]
 Lab --> WB
```

## Input / output flows

- **In:** H1 USD, Stage 1 cfg, Proximal Policy Optimization hyperparams, A10 CUDA
- **Out:** `model_*.pt` on NFS, W&B (browser), TensorBoard via SSH tunnel, RTX mp4 proofs, expense JSONL, STATUS.md, gitignored training-status.json

## Data stores

| Store | Type | Path |
|-------|------|------|
| Code | git | ~/Projects/BeamDojo |
| GPU logs | NFS | /lambda/nfs/beamdojo/logs |
| Proof clips | git (small) | ~/Projects/BeamDojo/proofs |
| Spend | JSONL | ~/Projects/BeamDojo/tracking/expenses.jsonl |
| Live train status | JSON (gitignored) | ~/Projects/BeamDojo/tracking/training-status.json |
| Kingdom mirror | JSON | avinashs-kingdom/public/data/research/ |

## Future plans

- Dual-terrain Stage 1 (flat collision + hidden beam heightfield)
- 1024-env CUDA train, then Stage 2 hard beam
- Unitree G1 + double critic as in the paper
- Do not train until Avinash has a place to copy checkpoints
