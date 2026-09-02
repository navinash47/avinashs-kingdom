---
type: concept
updated: 2026-09-02
tags: [wiki, karpathy, agents, personal-os]
---

# LLM wiki

Pattern from Andrej Karpathy: compile knowledge into a persistent interlinked Markdown wiki instead of re-running RAG on every question. In Kingdom this is the **durable brain** layer of the [[kingdom-personal-os]] — complementary to skills, registry, and Throne (not a replacement for orchestration).

## Layers

1. **raw** — immutable sources  
2. **wiki** — agent-maintained pages  
3. **schema** — `AGENTS.md` conventions  

## Ops

| Op | Agent skill | CLI |
|----|-------------|-----|
| Ingest | kingdom-wiki ingest | `npm run brain:ingest -- --file …` (stub + title/summary extract + checklist; review/complete with kingdom-wiki) |
| Query | kingdom-wiki query | `npm run brain:query -- <terms>` |
| Lint | kingdom-wiki lint | `npm run brain:lint` (heuristic v2 — links/orphans/stale/dupes + light status/claim echoes; still not LLM claim judge) |

File good answers back into the wiki. Daily loop: [[ops/personal-os-playbook]].

## This vault

Kingdom brain at `/Users/avinashnandyala/Projects/avinashs-kingdom/brain`. Skill: **kingdom-wiki**. Part of [[kingdom-personal-os]].

## Not the same as

**Autoresearch** (Karpathy) — overnight GPU training experiments. Not used for Kingdom ops.
**Harness FSM/KG** — typed control topology; see [[brain-harness-fsm]].
