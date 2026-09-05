---
type: concept
updated: 2026-08-11
tags: [agents, cicd, youtube]
---

# Multi-agent YouTube lab workflow

Junior SWE agents on YouTube Editor Lab use + mission cards.

- Parallel only on disjoint touches_paths
- High race_risk to minimize agents (schemas/CI/CONTEXT are serialization points)
- Every slice: branch to PR to CI to lead merge

See.
