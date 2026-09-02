# CI template for Kingdom-linked ventures

Copy `.github/workflows/kingdom.yml` pattern into sibling repos. Register test commands in `config/venture-registry.json` under `tests.commands`.

## Local test runner

```bash
node scripts/run-venture-tests.mjs --venture kingdom-ops
node scripts/run-venture-tests.mjs --venture procedural-city --json
```

## GitHub ingest

Requires `gh auth login`. Sync writes `public/data/cicd/<venture-id>.json` with last 5 workflow runs.

## Regression vs unit

Tag commands in registry: `"type": "unit" | "integration" | "regression"`.
