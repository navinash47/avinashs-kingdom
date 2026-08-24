---
name: sync-kingdom
description: >-
  Sync Avinash Kingdom panel data from venture STATUS, phases, and expenses.
  Use after editing STATUS.md, tracking/phases.json, tracking/expenses.jsonl, or
  when the user asks to sync Kingdom, refresh the command center, or update ventures.json.
---

# Sync Kingdom

## When

Run after any change to venture progress, phase gates, or expense logs that should appear in the Kingdom panel. When the user says **sync** for any project, inspect **every** linked repo from the path map below — do not sync one venture and skip the rest.

## Command

Must run with **full filesystem access** (sibling repos live outside the Kingdom workspace). A sandboxed run updates panel JSON but skips STATUS writes (`EPERM`).

```bash
cd /Users/avinashnandyala/Projects/avinashs-kingdom && npm run sync
```

This refreshes:
- `public/data/ventures.json` (progress/version/priority — **source of truth for the panel**)
- Procedural City from local **or `origin/main`** (whichever has more phase passes)
- ComicMainEngine from `~/Desktop/ComicMainEngine/data/v2a_program.json` first, then `data/usage.db` for V1 spend (not `~/ComicEngine`)
- `public/data/audits/phases-board.json`, `city-phases.json`, `comic-tasks.json`
- `brain/wiki/ops/live-tracker.md` (auto census — no need to ask)
- Mac + subscription audits, expenses sync rows
- `public/data/research-lab.json` + proof clips under `public/data/research/<id>/` (Research tab)

After sync, Research Lab is `/?tab=research`. GPU projects use `"kind": "research"` in `config/venture-registry.json`. Never commit `*.pt` weights.

Report success/failure from the script output. Do not skip sync after phase PASS/FAIL or STATUS edits.

## Where each project actually lives

Read these files. **Do not treat Kingdom `STATUS.md` / `ventures.json` as evidence you checked the project** — sync writes those.

| Venture | Root | Source of truth (read this) |
|---------|------|-----------------------------|
| WhatsApp | `~/Projects/whatsapp-voice-agents` | `tracking/phases.json` |
| YouTube | `~/Projects/youtube-editor-lab` | `STATUS.md` + `tracking/` / Cut Control state |
| Research / Atlas | `~/Projects/research-frontier-lab` | `STATUS.md` |
| BeamDojo / Dojo | `~/Projects/BeamDojo` | `STATUS.md` + `tracking/expenses.jsonl` + `proofs/` |
| City | `~/ProceduralCity` | `tracking/phases.json` — prefer `origin/main` if local branch is stale |
| Comic | `~/Desktop/ComicMainEngine` | `data/v2a_program.json` (2A A0–A5). V1 board is `data/usage.db`. Dashboard `:8770/v2a` |
| Job Jugaad | `~/Projects/job-jugaad` | `data/applications.json` |
| Mac optimize | `~/Projects/mac-optimize-audit` | `reports/latest.json` + `STATUS.md` |
| Kingdom ops | `~/Projects/avinashs-kingdom` | kill-list |
| Shorts | — | parked |

Path map page: `brain/wiki/concepts/where-files-live.md`.

## After sync (required)

1. Open each source-of-truth file (or the live API/dashboard) and confirm the panel line matches.
2. If a venture started a **new program** (e.g. Comic 2A beside frozen Version 2), the old completion metric must not stay the only progress source — update `scripts/sync-kingdom.mjs` in the same session.
3. If the UI still shows parked ghosts: click **Reset seed** or hard-refresh.

## Notes

- Panel progress bars are **read-only**; editing the source file + sync updates them.
- Manual expense/token edits stay in browser localStorage; synced rows refresh on load.
