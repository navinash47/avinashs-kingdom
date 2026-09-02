# Kingdom MCP (per-venture)

Phase 2 read-only MCP template. One Node stdio server, configured per venture via `KINGDOM_VENTURE_ID` + `config/venture-registry.json`. Registry of enabled servers: `config/mcp-registry.json`.

## Tools (read-only)

| Tool | Behavior |
|------|----------|
| `get_status` | Live STATUS.md fields + excerpt (refuses secret-looking files) |
| `get_phases` | `paths.phases` JSON or N/A |
| `list_capabilities` | Dashboard/tests/capabilities + MCP registration |

**Never** exposes `.env`, API keys, contact dumps, or model weights.

## Pilot: kingdom-ops

```bash
cd ~/Projects/avinashs-kingdom
npm run mcp:smoke -- kingdom-ops
# or
KINGDOM_VENTURE_ID=kingdom-ops node mcp/venture-server.mjs --smoke
```

## Cursor connect

Add to Cursor MCP settings (absolute path):

```json
{
  "mcpServers": {
    "kingdom-ops": {
      "command": "node",
      "args": [
        "/Users/avinashnandyala/Projects/avinashs-kingdom/mcp/venture-server.mjs"
      ],
      "env": {
        "KINGDOM_VENTURE_ID": "kingdom-ops"
      }
    }
  }
}
```

Then call `get_status` from the MCP inspector / agent tools.

## New venture

1. Copy template row in `config/mcp-registry.json` with the new `venture_id`.
2. Ensure venture is in `config/venture-registry.json` with `paths.status`.
3. Point Cursor MCP at `mcp/venture-server.mjs` with `KINGDOM_VENTURE_ID=<id>`.
4. See [[wiki/concepts/onboard-new-project]] MCP section.
5. `npm run sync` — control-surface includes `mcp` snapshot when hooked.

## Optional later (not Phase 2a)

Safe writes: `append_log`, `trigger_sync` — still never raw `.env` read.
