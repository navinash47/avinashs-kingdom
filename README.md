# Avinash's Kingdom

Personal command center for ventures, agents, token burn, expenses, subscription kill list, and Mac storage reclaim.

## Quick start

```bash
cd ~/Projects/avinashs-kingdom
npm install
npm run sync          # audits + venture STATUS + expenses → panel
npm run dev           # http://localhost:5173
```

`npm run sync` pulls:
- Subscription kill list + Mac storage summary
- Venture version / progress / next tasks from each repo `STATUS.md`
- Procedural City phase progress from `tracking/phases.json`
- Monthly subscription estimates + City API spend into the expenses ledger

Panel localStorage keeps your manual expense/token edits; synced rows (`sync-*`) refresh on load.

Edits (progress, expenses, token logs, agent budgets) persist in `localStorage`. Use **Export / Import / Reset seed** in the header.

## Portfolio weights (this week)

| Venture | Weight | Priority | Agent |
|---------|--------|----------|-------|
| WhatsApp / Voice | 35% | P0 | Agent Cash |
| YouTube editor | 20% | P0 | Agent Cut |
| Research Frontier | 15% | P1 | Agent Atlas |
| Procedural City | 15% | P1 (before Comic) | Agent Metro |
| ComicEngine | 10% | P2 | Agent Ink |
| Kingdom ops | 5% | Ongoing | Agent Steward |
| Shorts | 0% | Parked | — |

## Linked tools

### Subscription audit
```bash
cd ~/Projects/subscription-audit
source .venv/bin/activate
subaudit ingest
subaudit serve   # http://127.0.0.1:8741
```
Then from Kingdom: `npm run sync`

### Mac storage audit
```bash
cd ~/Projects/mac-storage-audit
python3 -m mac_storage_audit --quick --open
```
Then: `npm run sync`

Snapshots land in `public/data/audits/`. Venture + expense seeds update in `public/data/`.

## Venture repos

| Repo | Path |
|------|------|
| Kingdom | `~/Projects/avinashs-kingdom` |
| WhatsApp / Voice | `~/Projects/whatsapp-voice-agents` |
| YouTube editor | `~/Projects/youtube-editor-lab` |
| Research Frontier | `~/Projects/research-frontier-lab` |
| Procedural City | `~/ProceduralCity` |
| ComicEngine | `~/ComicEngine` |
| Subscription audit | `~/Projects/subscription-audit` |
| Mac storage audit | `~/Projects/mac-storage-audit` |

## Data files

Seed JSON under `public/data/`:
- `portfolio.json`, `ventures.json`, `agents.json`, `expenses.json`, `tokens.json`
- `audits/subscription-kill-list.json`, `audits/mac-storage-summary.json`
