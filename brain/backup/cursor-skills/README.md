# Cursor skills backup

Canonical copies of Kingdom personal skills, safe across Cursor account changes and new machines.

## What’s here

| Path | Role |
|------|------|
| [`../../.cursor/skills/`](../../.cursor/skills/) | Live project skills (Cursor loads these in Kingdom) |
| This folder’s skill dirs | Mirror for browsing / diffing |
| `kingdom-skills-*.tar.gz` | Portable archive to unpack into `~/.cursor/skills/` |

Skills: `kingdom-wiki`, `sync-kingdom`, `log-outreach`, `youtube-provenance`, `phase-gate`.

## Restore on a new Mac / personal Cursor account

From the Kingdom repo:

```bash
./scripts/restore-cursor-skills.sh
```

Or manually:

```bash
mkdir -p ~/.cursor/skills
tar -xzf brain/backup/cursor-skills/kingdom-skills-*.tar.gz -C ~/.cursor/skills
```

Then open Cursor with your **personal** email — skills are local files, not tied to college login.

## Refresh this backup after editing skills

```bash
./scripts/backup-cursor-skills.sh
```
