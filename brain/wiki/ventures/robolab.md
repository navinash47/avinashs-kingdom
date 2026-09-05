---
type: venture
venture_id: robolab
updated: 2026-09-05
tags: [research, robotics, rl, runpod, p1]
---

# RoboLab

Standalone robotics RL lab: train, evaluate, transfer, and visualize runs from a dashboard (MuJoCo / PyBullet gate; Genesis best-effort; Isaac stubs).

- **Id:** `robolab`
- **Kind:** research (Kingdom Research Lab)
- **Agent:** Agent Robo
- **Repo:** `~/Projects/robolab`
- **Remote:** https://github.com/navinash47/robolab
- **Live status:** v0.5 · Phase 5B · **48%** (synced from `STATUS.md`)
- **Dashboard:** http://localhost:5173 · API `:8000`

## Job

Ship phase-gated robotics RL with live W&B, RunPod workers, dual-sim URDF parity, and human UI gates — not slides.

## Agent rules (keep separate)

Canonical rules live **in the RoboLab repo only**:

- `~/Projects/robolab/.cursor/rules/robolab-ops.mdc`
- Phase board: `docs/PHASES.md`
- Sims / Isaac hard-nos: `docs/SIMULATORS.md`, `docs/ISAAC_INSTALL.md`

Do **not** apply Research Frontier Lab cost-aware rules here, and do not fold RoboLab rules into Frontier or Kingdom brain as a merged policy.

## Related

- [[architecture/robolab]]
- [[experiments/robolab]]
- [[concepts/research-lab]]
- [[concepts/where-files-live]]
- Skills: **sync-kingdom**, **phase-gate**, **runpod**
