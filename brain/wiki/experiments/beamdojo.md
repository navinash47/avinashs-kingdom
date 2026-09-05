---
type: experiments
venture_id: beamdojo
updated: 2026-08-24
---

# BeamDojo experiments

- **2026-08-24:** Stage 1 CUDA smoke on Lambda A10 - 64 envs, 5 Proximal Policy Optimization iters, ~2k steps/s, checkpoints model_0.pt / model_4.pt on NFS. Video: proofs/stage1-smoke-gpu.mp4
- **2026-08-24:** Isaac Lab 2.3.2 + Isaac Sim 5.1 Docker on A10; Vulkan needed libnvidia-gl-580-server + regenerated NVIDIA CDI.
- **2026-08-24:** Foot-frame 15-sample foothold vs env-local beam (not world XY). Dual-terrain height scan still TODO.
- **2026-08-24:** Watch GPU trains in the browser via **Weights & Biases** (project beamdojo), not a public Isaac page. Kingdom Research Lab shows last-known (idle/unknown unless a live file says running). TensorBoard: `ssh -L 6006:localhost:6006 lambda-beamdojo` then TensorBoard on.
