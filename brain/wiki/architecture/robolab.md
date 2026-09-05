---
type: concept
updated: 2026-09-05
tags: [architecture, robolab]
---

# RoboLab architecture

```mermaid
flowchart LR
  UI[web dashboard :5173] --> API[FastAPI :8000]
  API --> Local[local runner]
  API --> RP[RunPod runner]
  Local --> MJ[MuJoCo adapter]
  Local --> PB[PyBullet adapter]
  RP --> Worker[robolab-worker:phase3]
  MJ --> URDF[diffdrive_lidar URDF]
  PB --> URDF
  API --> WB[W&B]
  API --> Fail[/failures logistics vs experiment]
```

- **In:** RunConfig (task, sim, arch, timesteps, budget), URDF, optional Genesis/Isaac stubs
- **Out:** run rows, SSE progress, W&B curves/videos, cost ledger, failure flags
- **Rules home:** repo `.cursor/rules/robolab-ops.mdc` only (not Frontier)

## Related

- [[ventures/robolab]]
- [[experiments/robolab]]
