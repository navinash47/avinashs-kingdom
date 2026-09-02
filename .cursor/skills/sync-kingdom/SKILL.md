---
name: sync-kingdom
description: >-
  Sync Venture Fleet Control Plane panel data from venture STATUS, phases, and expenses.
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
- **`public/data/control-surface.json`** (virtual control plane snapshot + FSM + capabilities + **onboarding.template** — **must update every sync**)
- **`brain/harness/empty-model/graph.json` + `fsm.json`** (deterministic KG/FSM seed for the brain harness)
- Procedural City from local **or `origin/main`** (whichever has more phase passes)
- ComicMainEngine from `~/Desktop/ComicMainEngine/data/v2a_program.json` first, then `data/usage.db` for V1 spend (not `~/ComicEngine`)
- `public/data/audits/phases-board.json`, `city-phases.json`, `comic-tasks.json`
- `brain/wiki/ops/live-tracker.md` (auto census — no need to ask)
- Mac + subscription audits, expenses sync rows
- `public/data/research-lab.json` + proof clips under `public/data/research/<id>/` (Research tab)
- `public/data/skill-graph.json` (agents ↔ skills; Dojo/Steward maps included)

**New project:** `npm run venture:new -- --id <slug> --repo ~/Projects/<slug> --agent agent-<short> [--write]` (or copy `config/venture-template.json` → registry row), add `AGENT_SKILL_MAP`, wiki pages, then sync. Checklist: `brain/wiki/concepts/onboard-new-project.md`. Architecture: `brain/wiki/concepts/kingdom-personal-os.md`. Daily loop: `brain/wiki/ops/personal-os-playbook.md`.

After sync, Research Lab is `/?tab=research`. GPU projects use `"kind": "research"` in `config/venture-registry.json`. Never commit `*.pt` weights.

**Post-sync hygiene (wiki):** `npm run brain:lint` — orphans / broken links / missing index. Optional after ingest or large wiki edits. Wiki search: `npm run brain:query -- <terms>`. Harness topology: `npm run brain:harness -- list`.

Report success/failure from the script output. Do not skip sync after phase PASS/FAIL or STATUS edits.

## Where each project actually lives

Read these files. **Do not treat Kingdom `STATUS.md` / `ventures.json` as evidence you checked the project** — sync writes those.

| Venture | Root | Source of truth (read this) |
|---------|------|-----------------------------|
| WhatsApp | `~/Projects/whatsapp-voice-agents` | `tracking/phases.json` |
| YouTube | `~/Projects/youtube-editor-lab` | `STATUS.md` + `tracking/` / Cut Control state |
| Research / Atlas | `~/Projects/research-frontier-lab` | `STATUS.md` |
| BeamDojo / Dojo | `~/Projects/BeamDojo` | `STATUS.md` + `tracking/expenses.jsonl` + `tracking/training-status.json` + `proofs/` |
| City | `~/ProceduralCity` | `tracking/phases.json` — prefer `origin/main` if local branch is stale |
| Comic | `~/Desktop/ComicMainEngine` | `data/v2a_program.json` (2A A0–A5). V1 board is `data/usage.db`. Dashboard `:8770/v2a` |
| Job Jugaad | `~/Projects/job-jugaad` | `data/applications.json` |
| Mac optimize | `~/Projects/mac-optimize-audit` | `reports/latest.json` + `STATUS.md` |
| Kingdom ops | `~/Projects/avinashs-kingdom` | kill-list |
| Shorts | — | parked |

Path map page: `brain/wiki/concepts/where-files-live.md`.

## After sync (required)

1. Open each source-of-truth file (or the live API/dashboard) and confirm the panel line matches.
2. Confirm **control surface** refreshed: `public/data/control-surface.json` `synced_at` is fresh, and Throne → Virtual control shows the new stamp (or hard-refresh). Optional: `npm run brain:harness -- list`. Optional hygiene: `npm run brain:lint`.
3. If a venture started a **new program** (e.g. Comic 2A beside frozen Version 2), the old completion metric must not stay the only progress source — update `scripts/sync-kingdom.mjs` in the same session.
4. If the UI still shows parked ghosts: click **Reset seed** or hard-refresh.

## Control surface rule

**Sync Kingdom ⇒ update virtual control app always.** Do not treat sync as “ventures.json only.” The Throne control bar, fleet strip, skill graph, and harness empty-model are part of the same pass (`scripts/lib/control-surface.mjs`). Wiki: `brain/wiki/concepts/virtual-control-surface.md`.

## Cloud UI merge (Obs 11 — required)

When merging cloud/Cursor UI branches into Mac Kingdom `main`, **do not** take “theirs” for the App shell. Full playbook: `brain/wiki/ops/cloud-ui-merge-playbook.md`.

### Keep-ours

- `src/App.tsx` + `OrchestratorProvider` / OrchestratorContext wiring
- `VentureSidebar` / `VenturePage` (not VentureBoard+onUpdate)
- `src/components/FleetGraph/` **directory** (not a single-file `FleetGraph.tsx`)

### Fold-in

Land the branch’s *feature* as plugins / Research Lab / Vite middleware `/live/...`. Never replace the Mac router with an older `useState` tab shell.

### Drop collisions

If incoming adds `FleetGraph.tsx` while `FleetGraph/` exists — **drop** the file; port unique bits into the folder. Do not reintroduce removed Storage nav / board-only shells.

### Verify

`npm run build` (or typecheck) + smoke `/?tab=throne` and the feature surface. Checklist is in the ops playbook; an agent reading this skill alone must be able to merge without wiping OrchestratorContext.

## Notes

- Panel progress bars are **read-only**; editing the source file + sync updates them.
- Manual expense/token edits stay in browser localStorage; synced rows refresh on load.
- Open control plane: `npm run dev` → `http://localhost:5173/?tab=throne` (⌘K for command palette).
