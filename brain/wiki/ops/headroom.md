---
type: ops
updated: 2026-08-11
tags: [headroom, tokens, cursor]
---

# Headroom runbook (Kingdom)

Token compression layer. Complements [[task-observer-headroom]] (observer = skills; headroom = tokens).

## Install (done)

```bash
uv tool install --python 3.13 "headroom-ai[all]"
# CLI: ~/.local/bin/headroom
```

Upstream clone: 

## Daily commands

```bash
cd ~/Projects/avinashs-kingdom
npm run headroom:start # proxy on :8787
npm run headroom:status
npm run headroom:stop
npm run headroom:setup # print Cursor click-path
```

## Cursor wiring (Kingdom policy)

**Do not** set Override OpenAI Base URL to Headroom. That slot is **OmniRoute** (`localhost:20128`) for coding/text Large Language Model calls.

Use Headroom via **MCP only**:

- Tools: headroom_compress, headroom_retrieve, headroom_stats
- Registered in (+ project)
- Reload MCP / restart Cursor if tools don’t appear

Optional later (advanced): chain OmniRoute to Headroom as an upstream hop - only if you explicitly want transparent compression without giving up OmniRoute. Not configured by default.

## MCP

Primary integration for Cursor. Proxy () is optional - useful for stats/dashboard and non-Cursor agents; not required for MCP compress/retrieve.

## Savings check

```bash
curl -s http://127.0.0.1:8787/stats
# or: headroom dashboard # if proxy running
```

Coding-agent savings are typically ~15–20%, not the JSON 60–95% headline.
