---
name: youtube-provenance
description: >-
  Enforce clip provenance for YouTube editor lab (source URL, fair-use, times, beat).
  Use when researching clips, writing beat sheets, Screenplay Desk assets, Clip Researcher
  schemas, or when the user mentions provenance, fair use, subclip, or anti-slop YouTube.
---

# YouTube provenance

**Repo:** `/Users/avinashnandyala/Projects/youtube-editor-lab`  
**Doctrine:** real footage only — refuse mystery clips. See Kingdom brain `wiki/concepts/anti-slop-youtube.md`.

## Required fields (every clip asset)

| Field | Meaning |
|-------|---------|
| `source_url` | Canonical URL of the source video/page |
| `source_title` | Title as published |
| `fair_use_note` | Why this use is OK (commentary, brief excerpt, etc.) — honest, not legal advice |
| `start_s` | Subclip start (seconds) |
| `end_s` | Subclip end (seconds) |
| `local_path` | Path on disk once downloaded/cut (or `pending`) |
| `used_in_beat` | Beat id / label in the screenplay, or `unused` |

## Agent behavior

1. If any required field is missing, ask or mark the asset **incomplete** — do not treat it as ready to edit.
2. Prefer a JSON or Markdown table of assets next to the beat sheet in the YouTube repo (e.g. `provenance/` or beside the draft).
3. Never invent source URLs. If unknown, leave blank and block “ready” status.
4. Shorts / fake-face pipelines stay parked — do not expand scope into them.
