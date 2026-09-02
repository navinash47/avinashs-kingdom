---
type: architecture
venture_id: mac-optimize-audit
updated: 2026-08-24
---

# Mac optimize audit architecture

## System design

RAM/CPU/swap/disk audit with safe cleaner recommendations. Live dashboard :8742.

## Input / output flows

- **In:** macOS host metrics, process RSS
- **Out:** latest.json report, steward dashboard

## Data stores

| Store | Type | Path |
|-------|------|------|
| Latest report | JSON | reports/latest.json |
