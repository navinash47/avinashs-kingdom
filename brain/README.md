# Kingdom Brain

Obsidian-compatible Markdown wiki for Avinash’s Kingdom (Karpathy LLM Wiki pattern).  
**This is the understanding place for citizens of the Kingdom** — start at the map below.

## First stop for citizens

1. [`wiki/overview.md`](./wiki/overview.md) — citizens’ map, sync health, constitution  
2. [`wiki/concepts/where-files-live.md`](./wiki/concepts/where-files-live.md) — where every province’s files live (WhatsApp root, City, Comic, audits…)  
3. [`wiki/ops/steward-dashboard.md`](./wiki/ops/steward-dashboard.md) — Mac disk + subscription kill list  

## Open in Obsidian (optional)

1. Install [Obsidian](https://obsidian.md) if you want.  
2. Open folder as vault: `/Users/avinashnandyala/Projects/avinashs-kingdom/brain`  
3. Browse `wiki/`; leave `raw/` as immutable sources.

You do not need Obsidian — Cursor agents maintain the wiki via skills.

## Cursor skills (personal + backed up)

Live on this Mac: `~/.cursor/skills/`  
Also in this repo: `.cursor/skills/` and `brain/backup/cursor-skills/`.

| Skill | Invoke when |
|-------|-------------|
| `kingdom-wiki` | Ingest a URL/file, query the brain, or lint the wiki |
| `sync-kingdom` | After STATUS / phases / expenses change |
| `log-outreach` | Broker or pilot outreach touches |
| `youtube-provenance` | Clip research / screenplay assets |
| `phase-gate` | Closing a phase on a phased venture |
| `kingdom-tunnels` | Cloudflare public links for dashboards |

Restore after account/machine change: `./scripts/restore-cursor-skills.sh` from the Kingdom repo.

## Layout

```
brain/
  AGENTS.md          # schema for agents
  raw/inbox/         # drop new sources here
  raw/research/      # papers / abstracts
  wiki/              # overview, ventures, ops, concepts
  backup/            # Cursor skills backup
```

## First Research use

Agent Atlas: drop abstracts into `raw/research/`, then run **kingdom-wiki** ingest. Vertical seed: generative comics / multimodal consistency.
