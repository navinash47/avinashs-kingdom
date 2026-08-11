# Kingdom Brain — Wiki Schema

Persistent knowledge base for Avinash’s Kingdom. The agent maintains this wiki; the human curates sources and asks questions.

**Vault root:** `/Users/avinashnandyala/Projects/avinashs-kingdom/brain`

## Layers

1. **raw/** — Immutable sources. Never edit filed sources; only add. Use `raw/inbox/` for new drops; move to `raw/research/` or `raw/ventures/` when processed.
2. **wiki/** — LLM-maintained Markdown. Interlinked pages, summaries, claims, gaps.
3. **This file (schema)** — Conventions and workflows. Co-evolve with use.

## Page types

| Type | Path | Purpose |
|------|------|---------|
| Overview | `wiki/overview.md` | Citizens’ map + portfolio |
| Ops | `wiki/ops/` | Steward dashboards (disk, subs) |
| Index | `wiki/index.md` | Catalog of every page (one-line summary each) |
| Log | `wiki/log.md` | Append-only timeline |
| Venture | `wiki/ventures/<id>.md` | One page per Kingdom venture |
| Concept | `wiki/concepts/<slug>.md` | Ideas, patterns, decisions |
| Entity | `wiki/entities/<slug>.md` | People, orgs, tools, papers-as-entities |
| Source | `wiki/sources/<slug>.md` | Summary of one ingested source |

Use Obsidian-style `[[wiki-links]]` between pages. Prefer relative paths from the page.

## Frontmatter (recommended)

```yaml
---
type: venture|concept|entity|source|overview
updated: YYYY-MM-DD
tags: []
---
```

## Operations

### Ingest

1. Place or fetch source into `raw/inbox/` (or `raw/research/` for papers).
2. Read the source. Do not modify the raw file after filing.
3. Write `wiki/sources/<slug>.md` (summary, key claims, limitations, links).
4. Update related venture / concept / entity pages (create if missing).
5. Update `wiki/index.md`.
6. Append to `wiki/log.md`:
   `## [YYYY-MM-DD] ingest | Title`
7. Prefer one source per ingest pass unless the human asks for a batch.

### Query

1. Read `wiki/index.md` first, then drill into relevant pages.
2. Answer with citations (page paths). Prefer wiki over re-deriving from raw unless raw is needed.
3. File valuable answers back as `wiki/concepts/` or venture notes when the human agrees (or when clearly durable).

### Lint

Periodically check for: orphan pages, broken `[[links]]`, duplicate topics, stale claims vs newer sources, concepts mentioned but lacking a page. Report findings; fix only what the human approves unless they said “lint and fix”.

## Domain focus

- **Cash / WhatsApp:** India SMB, real-estate broker vertical, pilot outreach — do not invent US-entity pivots.
- **YouTube:** Anti-slop long-form; real clip provenance required.
- **Research:** First vertical = generative comics / multimodal consistency; abstracts + claims, not full-PDF dumps by default.
- **Portfolio weights:** Prefer Kingdom README / `wiki/overview.md` over chat memory.

## Skills

Use Cursor skills: `kingdom-wiki`, `sync-kingdom`, `log-outreach`, `youtube-provenance`, `phase-gate`, `kingdom-tunnels`, `task-observer`.

## Secrets

Never put API keys, `.env` contents, or personal contact phone/email dumps into the wiki. Contact tracking stays in venture outreach tools.
