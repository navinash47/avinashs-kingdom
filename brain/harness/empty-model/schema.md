# Empty-model schema — portable project OS contract

Typed nodes, edges, sync state, and control actions for the Kingdom **personal OS**: durable brain + skills + orchestrator + Throne, reusable for current *and* future ventures.

This is not a neural model and not an FSM toy. The FSM is one slice of the **orchestrator contract**; the wiki is the compiled knowledge layer; the registry is the project plug-in surface.

## Layers (how they fit)

| Layer | Artifact | Role |
|-------|----------|------|
| Brain instructions | `brain/AGENTS.md` + wiki | Durable “why / how” for agents |
| Skills | Cursor `SKILL.md` (progressive disclosure) | Procedural playbooks loaded on demand |
| Project registry | `config/venture-registry.json` | Plug-in ventures (ports, paths, github, tests) |
| Future project template | `config/venture-template.json` | Empty-but-real onboarding schema |
| Typed world model | this schema + `graph.json` | Deterministic what-is-connected |
| Control FSM | `fsm.json` | What actions are legal *now* |
| Sync state | `public/data/control-surface.json` | Snapshot Throne + agents query |
| One-pane UI | `/?tab=throne` | Human control surface |

## Node types

| type | id pattern | meaning |
|------|------------|---------|
| `orchestrator` | `hub:kingdom` | Virtual control plane (UI + sync + contract) |
| `venture` | `venture:<id>` | Registered project / province |
| `agent` | `agent:<id>` | Cursor agent persona for a venture |
| `skill` | `skill:<name>` | Cursor skill (`.cursor/skills` or `~/.cursor/skills`) |
| `capability` | `capability:<id>` | Declared action surface a venture exposes (dashboard, tests, sync paths, MCP later) |
| `service` | `service:<port>` | Optional local dashboard process |

## Edge relations

| rel | from → to | meaning |
|-----|-----------|---------|
| `sync` | hub → venture | Sync pulls STATUS/phases into panel |
| `agent` | venture → agent | Venture owned by agent |
| `skill` | agent → skill | Agent should load this skill |
| `capability` | venture → capability | Venture exposes this control/capability |
| `dashboard` | venture → service | Embeddable local dashboard |

## Sync state (control surface)

Every `npm run sync` must refresh:

1. `public/data/control-surface.json` — FSM + venture/skill summary + graph + **onboarding.template** pointer
2. `brain/harness/empty-model/graph.json` + `fsm.json`

Minimum sync-state fields agents may rely on:

- `synced_at`
- `fsm.state` / `fsm.allowed`
- `summary` (venture counts, skills, agents_without_skills)
- `ventures[]` (id, progress, agentId, repoPath, dashboardPort, kind)
- `graph.nodes` / `graph.edges`
- `open.throne` / `open.harness`
- `onboarding.template` → `config/venture-template.json`

## Control actions

States: `idle` → `syncing` → `ready` | `degraded` | `orchestrating`

Events: `sync_start`, `sync_complete`, `sync_fail`, `start_all`, `stop_all`, `idle`

Allowed while `ready` (orchestrator contract):

| action | meaning |
|--------|---------|
| `sync` | Refresh panel + harness from all registered repos |
| `start_service` / `stop_service` | One venture dashboard |
| `start_all` / `stop_all` | Fleet dashboards |
| `open_venture` | Jump to venture in panel |
| `open_graph` / `open_research` | Panel tabs |
| `run_tests` | Registry-declared test commands |

## Venture node (required fields when registering)

From registry / template:

- `id`, `repoPath`, `agentId`
- `wiki.{venture,architecture,experiments}` paths
- `paths.status` (and optional phases/expenses)
- optional: `kind`, `field`, `dashboard`, `github`, `tests`, `capabilities[]`, `skills[]`

## Skill node

- Discovered from skill dirs on sync
- Wired to agents via `AGENT_SKILL_MAP` in `scripts/lib/skill-graph.mjs`
- Missing map row = sync defect (empty UI edge), not “no skills needed”

## Capability node (lean)

Declare what a venture *can* do for the OS without inventing MCP yet. Examples:

- `capability:dashboard:<port>`
- `capability:tests:<venture-id>`
- `capability:phases:<venture-id>`
- `capability:research:<venture-id>`

Sync may emit capability nodes from registry `capabilities[]` or inferred dashboard/tests.

## Extending (future projects)

1. `npm run venture:new -- --id <slug> --repo ~/Projects/<slug> --agent agent-<short> [--write]` (or copy `config/venture-template.json` → registry row). See [[wiki/concepts/onboard-new-project]].
2. Add `AGENT_SKILL_MAP` entry.
3. Wiki pages + path map + index/log.
4. `npm run sync` → Throne shows the node; `npm run brain:lint` for hygiene.

Do **not** hand-edit `graph.json` / `fsm.json`.

## Wiki toolchain (same harness folder)

| Script | npm | Role |
|--------|-----|------|
| `lint.mjs` | `brain:lint` | Health of compiled wiki |
| `wiki-query.mjs` | `brain:query` | Search compiled wiki |
| `ingest.mjs` | `brain:ingest` | Raw filing checklist / scaffold |
| `query.mjs` | `brain:harness` | This KG/FSM |