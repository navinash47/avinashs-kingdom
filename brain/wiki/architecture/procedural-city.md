---
type: architecture
venture_id: procedural-city
updated: 2026-08-24
---

# Procedural City architecture

## System design

Deterministic procedural city with Unity geometry, streaming, Large Language Model scene director, generative assets. 92 phase gates. Python dashboard :8765.

## Input / output flows

- **In:** phase specs, layout constraints, Large Language Model scene briefs
- **Out:** validated city layouts, Unity geometry, streaming chunks

## Data stores

| Store | Type | Path |
|-------|------|------|
| Phases | JSON | tracking/phases.json |
| Expenses | JSONL | tracking/expenses.jsonl |

## Key libraries

- Python 3, Unity
- fal / Gemini for generative assets (budget-capped)

## Version history

- Stage E · Phase 49 · 49/92 pass

## Future plans

- Phase 49 three-layer validation pipeline
- Prefer origin/main when local branch stale

## Experiments log

See [[experiments/procedural-city]].
