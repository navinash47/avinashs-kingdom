---
type: concept
updated: 2026-09-02
tags: [architecture, personal-os, srs, phase2b, mcp, fleet, sync]
---

# Personal OS Phase 2b - all apps connected to Kingdom

**Status:** In progress (fleet MCP + gated writes + Cursor attach). 
**Parent:** [[personal-os-phase2-srs]] (Phase 2 W1–W4 complete). 
**Live tracker:** [[ops/personal-os-phase2b-tracker]]. 
**MCP:** `mcp/README.md` · `config/mcp-registry.json` · `.cursor/mcp.json`

## Problem

Phase 2 shipped a **pilot** MCP (`kingdom-ops`) and the OS contracts (sync to Throne, wiki tools, judge). The remaining work is **fleet connectivity**: every active venture with a real repo root is reachable from Cursor/agents via the same control surface (registry to sync/Throne + MCP + skills), without widening the secret surface.

## Goal

**All apps connected to Kingdom** means:

1. **Registry** - each active venture in `config/venture-registry.json` has `repoPath`, `paths.status`, and optional `mcp.enabled`.
2. **Sync / Throne** - `npm run sync` publishes an `mcp` snapshot on the control surface (configured servers + health: `configured`).
3. **MCP** - one stdio template (`mcp/venture-server.mjs`) per venture via `KINGDOM_VENTURE_ID`; tools work for every real root.
4. **Skills** - onboard-new-project + sync-kingdom + personal-os playbook describe attach, smoke, and gated writes.

## Architecture

```
config/venture-registry.json
 │
 ├──► sync-kingdom ──► public/data/control-surface.json (mcp.servers[])
 │ └──► Throne Virtual control surface
 │
 └──► config/mcp-registry.json
 │
 └──► mcp/venture-server.mjs (KINGDOM_VENTURE_ID=…)
 │
 ├── get_status / get_phases / list_capabilities (always)
 └── append_log / trigger_sync (KINGDOM_MCP_WRITES=1 only)
 │
 .cursor/mcp.json ───┘ Cursor attaches fleet
```

### Layer rules (unchanged from Phase 2)

| Layer | Must stay true |
|-------|----------------|
| STATUS / phases | Source of truth in each venture repo |
| MCP reads | Never `.env`, secrets, weights, contact dumps |
| MCP writes | Off by default; explicit env flag; append-only log + sync trigger only |
| Mac orchestrator shell | Obs 11 - keep App/OrchestratorProvider; cloud features as plugins |
| Judge | OmniRoute `:20128` when up; offline fallback always |

## Workstreams

| # | Deliverable | Acceptance |
|---|-------------|------------|
| B0 | This SRS + [[ops/personal-os-phase2b-tracker]] + index/log links | Linked from Phase 2 SRS |
| B1 | Cursor project `mcpServers` (`.cursor/mcp.json`) | One-liner in `mcp/README.md`; kingdom servers attachable |
| B2 | Fleet MCP roll-out | Every active venture with `repoPath` in mcp-registry + smoke green |
| B3 | Gated write tools | `append_log` + `trigger_sync` require `KINGDOM_MCP_WRITES=1`; default read-only |
| B4 | Judge live path docs | Offline verified; live probe documented (do not fail if OmniRoute down) |

## Non-goals

- One mega-MCP that bypasses per-venture STATUS.
- Force-push / rewriting `main`.
- Exposing secrets via MCP or committing weights.
- Replacing Obs 11 Mac shell with cloud UI.

## Related

- [[personal-os-phase2-srs]] · [[onboard-new-project]] · [[ops/personal-os-playbook]] · [[ops/cloud-ui-merge-playbook]] · [[virtual-control-surface]]
