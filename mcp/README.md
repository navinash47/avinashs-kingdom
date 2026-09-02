# Kingdom MCP (per-venture fleet)

Phase 2b: one Node stdio server template, configured per venture via `KINGDOM_VENTURE_ID` + `config/venture-registry.json`. Registry: `config/mcp-registry.json`. Cursor project config: `.cursor/mcp.json`.

SRS: `brain/wiki/concepts/personal-os-phase2b-srs.md` · Tracker: `brain/wiki/ops/personal-os-phase2b-tracker.md`

## Tools

| Tool | Default | Behavior |
|------|---------|----------|
| `get_status` | on | Live STATUS.md fields + excerpt (refuses secret-looking files) |
| `get_phases` | on | `paths.phases` JSON or honest N/A |
| `list_capabilities` | on | Dashboard/tests/capabilities + MCP registration |
| `append_log` | **gated** | Append one line to `tracking/mcp-agent-log.md` |
| `trigger_sync` | **gated** | Run Kingdom `npm run sync` (no secrets forwarded) |

**Enable writes:** set `KINGDOM_MCP_WRITES=1` on the MCP server env (or shell). Default is read-only.

**Never** exposes `.env`, API keys, contact dumps, or model weights.

## Cursor one-liner

Project MCP is already in `.cursor/mcp.json`. Reload MCP in Cursor (Settings → MCP → refresh, or restart Cursor). Then call `get_status` on any `kingdom-*` server.

```bash
# Verify without Cursor:
cd ~/Projects/avinashs-kingdom && npm run mcp:smoke:fleet
```

## Smoke

```bash
cd ~/Projects/avinashs-kingdom
npm run mcp:smoke -- kingdom-ops
npm run mcp:smoke:fleet
# Gated writes refuse by default; prove enable:
KINGDOM_MCP_WRITES=1 KINGDOM_VENTURE_ID=kingdom-ops node mcp/venture-server.mjs --smoke
```

## Fleet (active repo roots)

All ventures in `config/venture-registry.json` with a real `repoPath` are registered except `shorts` (`repoPath: null`).

## New venture

1. Copy template row in `config/mcp-registry.json` with the new `venture_id`.
2. Ensure venture is in `config/venture-registry.json` with `paths.status` + `"mcp": { "enabled": true, "read_only": true }`.
3. Add a block to `.cursor/mcp.json` (absolute path to `mcp/venture-server.mjs` + `KINGDOM_VENTURE_ID`).
4. See [[wiki/concepts/onboard-new-project]] MCP section.
5. `npm run mcp:smoke -- <id>` then `npm run sync`.

## Judge (related Phase 2)

`npm run brain:judge` uses OmniRoute at `http://127.0.0.1:20128/v1` when up; otherwise offline heuristic fallback (exit 0). Live probe: `curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:20128/v1/models` then `npm run brain:judge -- --require-llm` (exit 2 if down). Offline always: `npm run brain:judge -- --offline` / `npm run brain:judge:fixture`.
