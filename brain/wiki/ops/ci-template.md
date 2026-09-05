---
type: overview
updated: 2026-09-02
tags: [ops, ci, template]
---

# CI template for Kingdom-linked ventures

Copy pattern into sibling repos. Register test commands in under tests.commands.

## Local test runner

```bash
node scripts/run-venture-tests.mjs --venture kingdom-ops
node scripts/run-venture-tests.mjs --venture procedural-city --json
```

## GitHub ingest

Requires `gh auth login`. Sync writes with last 5 workflow runs.

## Regression vs unit

Tag commands in registry: `"type": "unit" | "integration" | "regression"`.
