# Empty-model schema

Typed nodes and edges for the Kingdom orchestrator harness.

## Node types

| type | id pattern | meaning |
|------|------------|---------|
| `orchestrator` | `hub:kingdom` | Virtual control plane (this repo's UI + sync) |
| `venture` | `venture:<id>` | Registered venture |
| `agent` | `agent:<id>` | Cursor agent persona for a venture |
| `skill` | `skill:<name>` | Cursor skill under `.cursor/skills` or `~/.cursor/skills` |
| `service` | `service:<port>` | Optional local dashboard (added when layers include services) |

## Edge relations

| rel | from → to | meaning |
|-----|-----------|---------|
| `sync` | hub → venture | Sync pulls STATUS/phases into panel |
| `agent` | venture → agent | Venture owned by agent |
| `skill` | agent → skill | Agent should load this skill |
| `dashboard` | venture → service | Embeddable local dashboard |

## FSM (control plane)

States: `idle` → `syncing` → `ready` | `degraded` | `orchestrating`

Events: `sync_start`, `sync_complete`, `sync_fail`, `start_all`, `stop_all`, `idle`

Allowed actions while `ready` include sync, start/stop services, open venture/graph/research, run tests.

## Extending

Add a venture → registry row → sync. Add a skill edge → `AGENT_SKILL_MAP` in `scripts/lib/skill-graph.mjs` → sync.
