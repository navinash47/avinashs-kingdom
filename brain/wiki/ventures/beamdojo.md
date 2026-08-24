---
type: venture
venture_id: beamdojo
updated: 2026-08-24
tags: [research, locomotion, isaac-lab, gpu]
---

# BeamDojo

Isaac Lab recreation of [BeamDojo](https://why618188.github.io/beamdojo/) (RSS 2025). Official training code was never released. First robot is **Unitree H1**, Stage 1 (walk on flat physics while imagining a 20 cm beam).

- **Id:** `beamdojo`
- **Kind:** research (Kingdom Research Lab)
- **Agent:** Agent Dojo
- **Repo:** `~/Projects/BeamDojo`
- **Remote:** https://github.com/navinash47/BeamDojo
- **GPU:** Lambda A10 (`159.54.170.194` while live) — CUDA only, no Mac/CPU/fal as sim
- **Live status:** Stage 1 smoke · **18%**

## Job

Get a humanoid to walk a balance beam in sim, then (later) the paper robot G1. Proof is GPU video + checkpoints on NFS, not slides.

## Checkpoints are insurance, not git

Weights stay on `/lambda/nfs/beamdojo/logs/`. Never commit `.pt`. Tell Avinash after any train so he can copy them off-box.

## Related

- [[architecture/beamdojo]]
- [[experiments/beamdojo]]
- [[concepts/research-lab]]
- [[concepts/where-files-live]]
