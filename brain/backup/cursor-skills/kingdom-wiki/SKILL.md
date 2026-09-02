---
name: kingdom-wiki
description: >-
  Maintain Venture Fleet Control Plane LLM wiki (ingest sources, query with citations, lint
  health). Use when ingesting URLs/files/pastes into the brain, answering
  research or portfolio questions from the wiki, linting orphans/broken links,
  or when the user mentions kingdom-wiki, brain vault, Obsidian wiki, or Agent Atlas knowledge store.
---

# Kingdom wiki

**Vault:** `/Users/avinashnandyala/Projects/avinashs-kingdom/brain`  
**Schema:** read `AGENTS.md` in the vault before first op in a session.

## Modes

Detect mode from the user request: **ingest** | **query** | **lint**.

### Ingest

1. Save source under `raw/inbox/` or `raw/research/` (papers). Prefer Markdown. Do not alter filed raw files later.
2. Write `wiki/sources/<slug>.md` with summary, claims, limitations, outbound `[[links]]`.
3. Update related `wiki/ventures/`, `wiki/concepts/`, `wiki/entities/` pages (create if needed).
4. Update `wiki/index.md` catalog rows.
5. Append `wiki/log.md`: `## [YYYY-MM-DD] ingest | <Title>`.
6. Tell the human which pages changed.

### Query

1. Read `wiki/index.md`, then open relevant pages (not raw-first unless wiki is empty).
2. Answer with citations as vault-relative paths.
3. Offer to file durable answers as a new concept/venture note; do so when the user agrees or when clearly portfolio-critical.

### Lint

Check and report: orphans, broken wiki-links, duplicate topics, stale claims, mentioned concepts without pages. Fix only if the user asked to fix; otherwise list proposed fixes.

## Rules

- No secrets, `.env`, or contact phone/email dumps in the wiki.
- Research default: abstracts + claims, not full-PDF dumps.
- First research vertical: generative comics / multimodal consistency.
