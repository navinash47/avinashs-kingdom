---
type: overview
updated: 2026-09-02
tags: [ops, personal-os, merge, orchestrator, cloud-agent]
---

# Cloud to Mac UI merge playbook

Encode Observation 11: cloud/Cursor feature branches often replay an **older App shell**. Naive “take theirs” on App.tsx wipes the Mac orchestrator. Skill: sync-kingdom (section **Cloud UI merge**). Architecture: [[concepts/kingdom-personal-os]].

## When this applies

Merging any branch that touches Kingdom UI (, tab shell, fleet graph, Research Lab, Vite plugins) - especially `origin/cursor/*` or cloud-agent PRs - into Mac main.

## Keep-ours (never take theirs)

| Path / concern | Why |
|----------------|-----|
| | Mac shell uses OrchestratorProvider + routed tabs - not useState tab switching |
| OrchestratorContext / provider wiring | Fleet control state lives here |
| VentureSidebar / VenturePage | Replaces VentureBoard+onUpdate pattern |
| **directory** | Prefer folder module over a single-file FleetGraph.tsx |
| Existing Mac router / tab contract | Do not reintroduce Storage-as-nav ghosts or board-only shells |

If git conflict markers appear on these files: **resolve by keeping ours**, then re-apply the *feature* (not the shell) from theirs.

## Fold-in pattern (land the feature)

1. Identify what the cloud branch actually adds (W&B live card, middleware, Research Lab widget, etc.).
2. Port that into the **current** shell:
 - Research / live training to Research Lab tab / components under the existing Research surface
 - HTTP live endpoints to Vite middleware or vite-plugins serving 
 - New leaf UI to new components/plugins; wire from existing pages
3. Do **not** replace App.tsx router with the branch’s older tab useState shell.

## Drop collisions

| Incoming | Action |
|----------|--------|
| FleetGraph.tsx (single file) when `FleetGraph/` exists | **Drop** the file; fold any unique code into `FleetGraph/` |
| Duplicate VentureBoard + onUpdate wiring | Prefer Mac VentureSidebar/VenturePage; port data hooks only |
| Extra nav items that Mac already removed (e.g. Storage) | Do not re-add unless product asks |

## Checklist (agent-ready)

```text
[ ] Identify cloud branch intent (feature vs shell rewrite)
[ ] Keep-ours: App.tsx, OrchestratorProvider, VentureSidebar/VenturePage, FleetGraph/
[ ] Fold feature into ResearchLab / plugins / Vite /live - not App shell
[ ] Drop colliding leaf files (FleetGraph.tsx vs FleetGraph/)
[ ] npm run build (or tsc) - shell still boots
[ ] Manual: /?tab=throne and the feature surface still work
[ ] Append wiki log if merge was substantive; sync if STATUS/panel touched
```

## Anti-patterns

- Resolving conflicts with “theirs” for App.tsx “to get the feature”
- Replacing OrchestratorContext with local useState tabs
- Committing both FleetGraph.tsx and `FleetGraph/`

## Related

- Observation 11 in (ACTIONED to this playbook)
- Daily loop: [[ops/personal-os-playbook]]
- Phase 2 SRS: [[concepts/personal-os-phase2-srs]]
