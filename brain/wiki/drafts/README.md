---
type: overview
updated: 2026-09-02
tags: [ops, auto-wiki, drafts]
---

# Wiki drafts (auto-wiki)

Phase 2 auto-wiki writes **unpublished** source pages here (`sources/<slug>.md`) with `publish_status: draft`.

- Do not treat drafts as compiled truth.
- Promote explicitly: `npm run brain:auto-wiki -- --promote <slug>` (runs `brain:lint` first; optional `--judge`).
- After promote, page moves to `wiki/sources/` and index/log are updated.
- Raw under `brain/raw/` stays immutable.

See [[ops/personal-os-playbook]] and `brain/harness/auto-wiki.mjs`.
