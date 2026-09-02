---
type: concept
updated: 2026-09-02
tags: [architecture, personal-os, brain, orchestrator, throne]
---

# Kingdom personal OS (architecture recommendation)

**Primary architecture:** *Compiled brain wiki + progressive skills + typed project registry/orchestrator contract + one-pane Throne*, with a lean control FSM and deterministic KG as the sync-owned world model — not as the whole product.

Optional overlays later: MCP tool servers per venture, decision-trace “context graph” logging, vector RAG only for large raw corpora.

**Phase 2 (hard ~10%):** design pack ready — [[personal-os-phase2-srs]] · tracker [[ops/personal-os-phase2-tracker]] · builder prompt [[ops/personal-os-phase2-builder-prompt]].

## Why this (vs pure FSM-only or pure vector RAG-only)

| Approach | Fits Kingdom? | Gap |
|----------|---------------|-----|
| **Pure FSM** | Good for legal actions *now* | No durable instructions, no skills, no compiled research memory |
| **Pure vector RAG** | OK for huge messy corpora | Re-derives answers every time; weak for fleet topology, ports, phase gates, “what can I start?” |
| **Karpathy LLM wiki alone** | Strong for *why* | Doesn’t drive Throne sync or fleet control |
| **Chosen stack** | Matches Cursor skills + multi-repo fleet + panel you already own | Add MCP/context-graph only when a venture needs them |

Serious builders (2024–2026) converge on: compile durable knowledge ([Karpathy llm-wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)), load procedures via progressive **Agent Skills** ([Anthropic](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)), keep a typed world / authority graph for control ([Agentic OS / graph-native kernels](https://gist.github.com/AnthonyAlcaraz/16b64213b1e6ca4b93dfed3f5a74dcb8)), and treat decision traces as a future “context graph” layer ([Foundation Capital](https://foundationcapital.com/ideas/context-graphs-ais-trillion-dollar-opportunity)) — without replacing the registry/orchestration write path.

## Five requirements → one stack

| Need | Kingdom home |
|------|----------------|
| (a) Durable brain instructions | `brain/AGENTS.md` + wiki ingest/query/lint |
| (b) Skills | Cursor `SKILL.md` + `AGENT_SKILL_MAP` |
| (c) Orchestrator across apps | `npm run sync` → control-surface + harness FSM/KG |
| (d) Future projects | `config/venture-template.json` → `npm run venture:new` → registry |
| (e) One-pane control | Throne `/?tab=throne` |

## Compiled-wiki toolchain (real commands)

| npm script | Script | Role |
|------------|--------|------|
| `brain:lint` | `brain/harness/lint.mjs` | Heuristic v2: broken links (error); orphans/index/stale `updated:`/dup titles/`venture_id`/status-phrase conflicts/claim dupes/log-lag (warn) — structure, not LLM claim judge |
| `brain:judge` | `brain/harness/judge.mjs` | Phase 2 additive contradiction judge (dry-run → `harness/reports/`; OmniRoute LLM with offline fallback; `--apply` → proposals only) |
| `brain:query` | `brain/harness/wiki-query.mjs` | Keyword search over wiki |
| `brain:ingest` | `brain/harness/ingest.mjs` | Semi-auto: `--file` → stub with best-effort title/summary + checklist; review/complete with kingdom-wiki |
| `brain:harness` | `brain/harness/query.mjs` | KG/FSM topology queries |
| `venture:new` | `scripts/new-venture.mjs` | Mechanical onboard from template |

Daily loop: [[ops/personal-os-playbook]].

## Contract surfaces

- Schema: `brain/harness/empty-model/schema.md` + `brain/AGENTS.md`
- Template: `config/venture-template.json`
- Live registry: `config/venture-registry.json`
- Snapshot: `public/data/control-surface.json` (`contract: kingdom-personal-os`, `onboarding`, capability nodes)
- How to plug a project: [[onboard-new-project]]

## Related

- [[llm-wiki]]
- [[brain-harness-fsm]]
- [[virtual-control-surface]]
- [[where-files-live]]
- [[research-lab]]
- [[ops/personal-os-playbook]]
- Venture: [[ventures/kingdom-ops]]
