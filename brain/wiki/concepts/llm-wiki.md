---
type: concept
updated: 2026-08-11
tags: [wiki, karpathy, agents]
---

# LLM wiki

Pattern from Andrej Karpathy: compile knowledge into a persistent interlinked Markdown wiki instead of re-running RAG on every question.

## Layers

1. **raw** — immutable sources  
2. **wiki** — agent-maintained pages  
3. **schema** — `AGENTS.md` conventions  

## Ops

Ingest → Query → Lint. File good answers back into the wiki.

## This vault

Kingdom brain at `/Users/avinashnandyala/Projects/avinashs-kingdom/brain`. Skill: **kingdom-wiki**.

## Not the same as

**Autoresearch** (Karpathy) — overnight GPU training experiments. Not used for Kingdom ops.
