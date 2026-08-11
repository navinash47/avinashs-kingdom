---
type: concept
updated: 2026-08-11
tags: [skills, tokens, meta, tooling]
---

# Task Observer + Headroom

Two separate tools people often mention together. They solve **different** problems.

| Tool | Repo (local clone) | Job | Fits Kingdom? |
|------|-------------------|-----|---------------|
| **Task Observer** | `~/Projects/task-observer` ([rebelytics/one-skill-to-rule-them-all](https://github.com/rebelytics/one-skill-to-rule-them-all)) | Watch sessions → log skill gaps/corrections → staged skill updates | **Yes** — improves skills + can feed [[llm-wiki]] |
| **Headroom** | `~/Projects/headroom` ([headroomlabs-ai/headroom](https://github.com/headroomlabs-ai/headroom)) | Compress tool/RAG/context before it hits the LLM | **Maybe** — token savings; not brain learning |

## Verdict for our use case

- **Learn the brain / improve skills by observing** → Task Observer. Not Headroom.
- **Conserve tokens** → Headroom (proxy/MCP). Realistic coding-agent savings are often ~**15–20%**, not the 60–95% headline (that’s mostly JSON/search dumps). Task Observer does **not** save tokens; loading it every chat can *cost* tokens.

## Kingdom wiring (Task Observer)

- Skill bundle: `~/.cursor/skills/task-observer/` (personal) + `.cursor/skills/task-observer/` (project mirror)
- Observation store: `brain/skill-observations/`
- Staged skill diffs: `brain/skill-updates/`
- Always-apply rule lists `task-observer`; load on multi-step work or “any observations?” — not casual Q&A

## Headroom wiring (tokens)

- CLI: `~/.local/bin/headroom` (`uv tool install … headroom-ai[all]`)
- Scripts: `npm run headroom:start|stop|status|setup`
- Runbook: [[ops/headroom]]
- MCP: `headroom` in `~/.cursor/mcp.json` (**primary** — do not steal OmniRoute Override Base URL)
- Cursor Override Base URL stays **OmniRoute** (`localhost:20128`)
- Optional proxy on `:8787` for stats / non-Cursor agents only

## Attribution

Task Observer: CC BY 4.0 — Eoghan Henn / rebelytics.com.  
Headroom: Apache 2.0 — headroomlabs-ai.
