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

Prefer the mechanical CLI first, then LLM compile:

```bash
cd /Users/avinashnandyala/Projects/avinashs-kingdom
npm run brain:ingest -- --file path/to/source.md   # files raw + scaffolds stub (best-effort title/summary) + prints index/log checklist
```

Then finish the kingdom-wiki compile:

1. Raw is already under `raw/inbox/` or `raw/research/` (CLI files a copy if needed). Do not alter filed raw files later.
2. **Review / complete** `wiki/sources/<slug>.md` (CLI may have extracted title + bullets — human still reviews); fill claims, limitations, outbound `[[links]]`.
3. Update related `wiki/ventures/`, `wiki/concepts/`, `wiki/entities/` pages (create if needed).
4. For system design / IO flows, update `wiki/architecture/<venture-id>.md`; for try logs, `wiki/experiments/<venture-id>.md`. Then remind to run `npm run sync`.
5. Update `wiki/index.md` catalog rows (CLI prints a pasteable row).
6. Append `wiki/log.md`: `## [YYYY-MM-DD] ingest | <Title>` (CLI prints the exact line).
7. Tell the human which pages changed.

### Query

1. Read `wiki/index.md`, then open relevant pages (not raw-first unless wiki is empty).
2. Answer with citations as vault-relative paths.
3. Offer to file durable answers as a new concept/venture note; do so when the user agrees or when clearly portfolio-critical.

### Lint

Prefer the deterministic CLI first (`heuristic v2` — structural + light dupes/stale/status-phrase/claim echoes; **still not** an LLM contradiction judge):

```bash
cd /Users/avinashnandyala/Projects/avinashs-kingdom && npm run brain:lint
```

Broken links → errors (exit 1). Missing index / orphans / stale `updated:` / duplicate titles / duplicate `venture_id` / conflicting lifecycle phrases / duplicate claims / updated-vs-log lag → warnings (exit 0 unless `--strict`).

**v2 warnings are review prompts, not a contradiction judge.** Report them first; fix broken links / missing `updated:` only when asked. Do **not** mass-edit wiki prose just to silence status-phrase or claim-echo warnings.

Fix only if the user asked to fix; otherwise list proposed fixes. Complementary CLIs: `npm run brain:query -- <terms>`, `npm run brain:ingest -- --list`.

## Rules

- No secrets, `.env`, or contact phone/email dumps in the wiki.
- Research default: abstracts + claims, not full-PDF dumps.
- First research vertical: generative comics / multimodal consistency.
