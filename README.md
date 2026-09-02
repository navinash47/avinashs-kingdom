# Venture Fleet Control Plane

Personal command center for ventures, agents, token burn, expenses, subscription kill list, and Mac speed (RAM/CPU/swap).

## Command orchestrator

- **⌘K** — command palette (ventures, agents, dashboards, sync commands)
- **Ventures tab** — click any venture for the **inspector** (Overview, Tech, Architecture, Data, Experiments, Models, CI & Tests)
- **Registry:** `config/venture-registry.json` (paths, ports, GitHub, test commands)
- **Sync output:** `public/data/manifests/`, `architecture/`, `experiments/`, `cicd/`

```bash
npm run sync              # includes tech census + architecture bundles + CI snapshot
npm run test:venture -- --venture kingdom-ops
```

## Quick start

```bash
cd ~/Projects/avinashs-kingdom
npm install
npm run sync          # audits + venture STATUS + expenses → panel
npm run dev           # http://localhost:5173
```

`npm run sync` pulls:
- Subscription kill list + Mac optimize snapshot (RAM/CPU/disk)
- Venture version / progress / next tasks from each repo `STATUS.md`
- Procedural City phases from local **or `origin/main`** (whichever has more passes)
- ComicMainEngine tasks/spend from `~/Desktop/ComicMainEngine/data/usage.db`
- Monthly subscription estimates + City API spend into the expenses ledger

Panel localStorage keeps your manual expense/token edits; synced rows (`sync-*`) refresh on load.

Edits (expenses, token logs, agent budgets) persist in `localStorage`. **Progress, version, priority, and phases are sync-owned** — not editable in the UI. After parking by mistake, click **Reset seed** or run `npm run sync` and refresh. Use **Export / Import / Reset seed** in the header.

## Portfolio weights (this week)

| Venture | Weight | Priority | Agent |
|---------|--------|----------|-------|
| WhatsApp / Voice | 35% | P0 | Agent Cash |
| YouTube editor | 20% | P0 | Agent Cut |
| Research Frontier | 15% | P1 | Agent Atlas |
| Procedural City | 15% | P1 (before Comic) | Agent Metro |
| ComicMainEngine | 10% | P2 | Agent Ink |
| Kingdom ops | 2% | Ongoing | Agent Steward |
| Mac optimize audit | 3% | P1 | Agent Janitor |
| Shorts | 0% | Parked | — |

## Brain (LLM wiki)

Persistent Obsidian-compatible knowledge store:

```text
~/Projects/avinashs-kingdom/brain
```

- Schema for agents: [`brain/AGENTS.md`](./brain/AGENTS.md)
- How to open / use: [`brain/README.md`](./brain/README.md)
- Drop sources in `brain/raw/inbox/` or `brain/raw/research/`; agents compile into `brain/wiki/`

**Personal Cursor skills** (`~/.cursor/skills/`): `kingdom-wiki`, `sync-kingdom`, `log-outreach`, `youtube-provenance`, `phase-gate`.

**Backup (survives college Cursor account expiry):** versioned under [`.cursor/skills/`](./.cursor/skills/) and [`brain/backup/cursor-skills/`](./brain/backup/cursor-skills/). Restore on a new machine: `./scripts/restore-cursor-skills.sh`.

Research Frontier uses this brain as its knowledge store (Agent Atlas).

## Linked tools

### Subscription audit
```bash
cd ~/Projects/subscription-audit
source .venv/bin/activate
subaudit ingest
subaudit serve   # http://127.0.0.1:8741
```
Then from Kingdom: `npm run sync`

### Mac optimize audit
```bash
cd ~/Projects/mac-optimize-audit
python3 -m mac_optimize audit --deep
python3 -m mac_optimize serve   # http://127.0.0.1:8742
```
Then: `npm run sync`

The older disk-only crawler still lives at `~/Projects/mac-storage-audit` if you want a duplicate/large-file pass.

Snapshots land in `public/data/audits/`. Venture + expense seeds update in `public/data/`.

## Venture repos

| Repo | Path |
|------|------|
| Kingdom | `~/Projects/avinashs-kingdom` |
| WhatsApp / Voice | `~/Projects/whatsapp-voice-agents` |
| YouTube editor | `~/Projects/youtube-editor-lab` |
| Research Frontier | `~/Projects/research-frontier-lab` |
| Procedural City | `~/ProceduralCity` (sync prefers `origin/main` if local lagging) |
| ComicMainEngine | `~/Desktop/ComicMainEngine` (not `~/ComicEngine`) |
| Subscription audit | `~/Projects/subscription-audit` |
| Mac optimize audit | `~/Projects/mac-optimize-audit` (`:8742`) |
| Mac storage audit (legacy disk) | `~/Projects/mac-storage-audit` |

## Data files

Seed JSON under `public/data/`:
- `portfolio.json`, `ventures.json`, `agents.json`, `expenses.json`, `tokens.json`
- `audits/subscription-kill-list.json`, `audits/mac-storage-summary.json`
