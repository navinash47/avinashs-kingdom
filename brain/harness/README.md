# Kingdom brain harness — personal OS contract

Lean **deterministic** project registry + orchestrator contract (typed KG + control FSM)
**plus** Karpathy compiled-wiki toolchain (lint / query / ingest stubs).
Not a neural model. Not an FSM-only toy. Own it, query it, plug future ventures into it.

## Why this exists

| Without harness | With harness |
|-----------------|--------------|
| Brain wiki is prose only | Typed *what is connected* + real lint/query commands |
| Throne is UI-only | Sync-owned control snapshot agents can query |
| Each new app reinvented | Registry + template + `venture:new` = plug-in contract |
| Pure vector RAG | Compiled wiki + deterministic edges beat re-retrieval for a personal fleet |
| Pure FSM | FSM alone can’t hold durable instructions or skills |

**Personal OS stack:** brain (`AGENTS.md` + wiki) → skills → registry/harness → sync → Throne.

## Layout

```text
brain/harness/
  README.md                 ← this file
  query.mjs                 ← KG/FSM CLI: list / neighbors / path / fsm / capabilities
  lint.mjs                  ← wiki health (heuristic v2): links + stale/dupes + light status/claim heuristics
  judge.mjs                 ← Phase 2 LLM/offline contradiction judge (advisory; dry-run default)
  auto-wiki.mjs             ← Phase 2 full auto wiki: inbox → drafts → gated promote
  fixtures/judge-conflict/  ← synthetic contradiction golden for `brain:judge --fixture`
  reports/                  ← judge / auto-wiki report artifacts (mostly gitignored JSON)
  wiki-query.mjs            ← keyword search over compiled wiki
  ingest.mjs                ← semi-auto: file → stub (title/summary extract) + index/log checklist
  empty-model/
    graph.json              ← auto-filled by npm run sync
    fsm.json                ← auto-filled by npm run sync
    schema.md               ← node/edge/sync/control contract (hand-owned)
```

Related repo roots (not under harness, but part of the OS):

- `config/venture-registry.json` — live ventures
- `config/venture-template.json` — empty-but-real future project schema
- `scripts/new-venture.mjs` — mechanical onboard CLI
- `public/data/control-surface.json` — Throne + agent snapshot
- `brain/wiki/` — compiled knowledge
- `brain/raw/` — immutable sources

## How it harnesses brain + skills + apps

1. **Apps** register in `config/venture-registry.json` (ports, github, tests, optional capabilities).
2. **`npm run sync`** refreshes `public/data/*` **and** rewrites `empty-model/graph.json` + `fsm.json` + control-surface (including onboarding template pointer).
3. **Skills** (`sync-kingdom`, `phase-gate`, …) are edges on agent nodes.
4. **Brain wiki** explains *why*; lint/query keep it healthy; harness stores *what is connected*.
5. **Throne** (`/?tab=throne`) is the one-pane control surface.

Architecture: [[wiki/concepts/kingdom-personal-os]].  
Daily ops: [[wiki/ops/personal-os-playbook]].  
Onboard: [[wiki/concepts/onboard-new-project]].

## Commands

```bash
cd ~/Projects/avinashs-kingdom

# Compiled wiki
npm run brain:lint                      # heuristic v2 (structure) — NOT the LLM judge
npm run brain:lint -- --strict          # fail on warnings too
npm run brain:lint -- --stale-days 90   # tune stale updated: threshold
npm run brain:lint -- --log-lag-days 14 # updated: lagging recent wiki/log mentions
npm run brain:judge                     # LLM/offline contradiction judge (dry-run → reports/)
npm run brain:judge:fixture             # golden synthetic conflict (offline)
npm run brain:judge -- --apply          # gated: write proposals/ only (no wiki rewrite)
npm run brain:auto-wiki                 # inbox → wiki/drafts + index/log proposals (idempotent)
npm run brain:auto-wiki -- --promote <slug>   # lint (+ optional --judge) then publish
npm run brain:auto-wiki -- --watch      # poll inbox
npm run brain:query -- personal OS
npm run brain:ingest -- --list
npm run brain:ingest -- --file brain/raw/inbox/<source>.md   # stub + title/summary extract + checklist

# Harness KG / FSM
npm run brain:harness -- list
npm run brain:harness -- capabilities
npm run brain:harness -- neighbors venture:whatsapp-voice
npm run brain:harness -- path hub:kingdom skill:sync-kingdom
npm run brain:harness -- fsm
npm run brain:harness -- allow sync

# Onboard
npm run venture:new -- --id demo --repo ~/Projects/demo --agent agent-demo
```

After sync that touches wiki structure: run `npm run brain:lint` as hygiene.

### `brain:lint` — heuristic v2

| Severity | What |
|----------|------|
| **Error** (exit 1) | Broken `[[wiki-links]]` / in-wiki markdown links |
| **Warning** (exit 0 unless `--strict`) | Missing index rows, orphans, missing/stale `updated:` frontmatter, duplicate H1 titles, duplicate `venture_id` under `ventures/` only, path/`venture_id` mismatch, architecture|experiments without matching `ventures/<id>`, light same-basename+title across folders, **conflicting lifecycle/priority phrases** across a venture’s `ventures|architecture|experiments` pages (status/census-cell contexts only — not live-tracker auto census), **duplicate claim bullets** (skips short/path-stub bullets), **`updated:` lagging a recent `wiki/log.md` wiki-link or path mention** |


This is structural + light phrase hygiene, **not** a full LLM contradiction / claim judge. False positives are expected on status words in prose — treat new checks as review prompts. Tune with `--stale-days` (default 90) and `--log-lag-days` (default 14).

### `brain:judge` — LLM / offline contradiction judge (Phase 2)

| | `brain:lint` (heuristic v2) | `brain:judge` |
|--|-----------------------------|---------------|
| Role | Deterministic structure + cheap phrase echoes | Advisory claim A vs B contradictions |
| Default | Always local | Dry-run report under `brain/harness/reports/` |
| LLM | Never | Tries OmniRoute (`OMNIROUTE_BASE_URL`, default `http://127.0.0.1:20128/v1`); falls back to offline heuristics |
| Writes wiki? | No (report only) | No — `--apply` writes **proposals** only |
| Golden | — | `npm run brain:judge:fixture` |

Both are required in the personal OS playbook: lint for structure, judge for claim review prompts. Human still approves material wiki edits.

### `brain:auto-wiki` — full auto wiki (Phase 2)

1. Drop markdown in `brain/raw/inbox/` (raw stays immutable).
2. `npm run brain:auto-wiki` → draft under `wiki/drafts/sources/` + index/log **proposals** + `reports/auto-wiki-latest.json`.
3. Re-run is **idempotent** (content-hash state).
4. Publish only with `npm run brain:auto-wiki -- --promote <slug>` (runs `brain:lint`; add `--judge` to also run the judge). Moves draft → `wiki/sources/`, updates index + log.

Semi-auto single-file still available via `brain:ingest` (checklist-oriented). Auto-wiki is the batch/watch path with an explicit draft gate.

### `brain:ingest` — semi-auto happy path

`--file` files the raw source under `raw/inbox/` if needed, **scaffolds** `wiki/sources/<slug>.md` by default with **best-effort title + summary bullets** extracted from the raw text, and prints an **exact** index-row + log-line checklist plus “review/complete with kingdom-wiki”. Human still reviews. Full LLM compile stays manual via the **kingdom-wiki** skill. Use `--no-scaffold` to skip the stub.

## Ownership rule

- Edit **schema.md** and this README by hand.
- Edit **venture-template.json** / registry by hand (or via `venture:new --write`) when plugging projects.
- Do **not** hand-edit `graph.json` / `fsm.json` — they are sync outputs.
- After registry / skill-map changes: `npm run sync`.
