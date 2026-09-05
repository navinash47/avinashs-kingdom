---
type: venture
updated: 2026-09-02
tags: [jobs, tracker, jugaad]
---

# Job Jugaad

- **Id:** job-jugaad
- **Agent:** Agent Jugaad (agent-jugaad)
- **Repo:** 
- **Dashboard:** `http://127.0.0.1:8790` (Cloudflare tunnel via / jugaad)
- **Status:** Tracker v0.1 · P1 · weight 8%

## What it is

Applications tracker: **company + specific role** through a pipeline (wishlist to applied to interviewing to offer / rejected / ghosted). File-backed at. Auto-updates STATUS.md progress as `applied-or-beyond / target` (default target 30).

## Sync

- Kingdom reads STATUS.md + writes 
- Progress formula: see [[ops/live-tracker]]

## Paths

| Path | Role |
|------|------|
| | Source of truth |
| STATUS.md | Kingdom progress |
| server.mjs | API + UI on :8790 |
| | Vite React board |

## Career targeting (2026-09-02)

- **Primary roles:** Applied Artificial Intelligence Engineer, Artificial Intelligence Agent Engineer, Artificial Intelligence Software Engineer, Forward Deployed Engineer (Agentic) - pick 1–2 after role comparison
- **Resume knowledge:** - approval dashboard :5199 · [[concepts/resume-master-knowledge]]
- **Role comparison matrix:** (best-for / hero projects / avoid - read before choosing primary track)
- **Seven export tracks:** `tracks/track-{role}.tex` to `tracks/preview-pdf/Avinash_Nandyala_*.pdf`
- **LinkedIn / bio copy:** CAREER_MARKETING.md in this repo
- **Wishlist:** 30 company+role rows seeded in (status wishlist - progress stays 0% until applied+)
- **Study:** [[concepts/agentic-interview-prep]] · claim gates: [[concepts/agentic-resume-gates]] · stack: [[concepts/agentic-stack-guidance]]

### Posting type to resume PDF

| Posting type / keywords | Recommended track PDF |
|-------------------------|------------------------|
| Artificial Intelligence Agent, Agentic, multi-agent, tool use | Avinash_Nandyala_Agentic_Engineer.pdf |
| Applied Artificial Intelligence, GenAI, Large Language Model product engineer | Avinash_Nandyala_AI_Engineer.pdf |
| Forward Deployed, Solutions, customer engineer | Avinash_Nandyala_FDE.pdf (WhatsApp bullets unlock after Phase 8) |
| ML Engineer, training/eval, clinical ML | Avinash_Nandyala_MLE.pdf |
| Robotics, Reinforcement Learning, simulation, Isaac, locomotion | Avinash_Nandyala_Robotics.pdf |
| Backend, platform, distributed systems (non-Artificial Intelligence) | Avinash_Nandyala_SDE_Mid.pdf |
| SWE I, new grad, university recruiting | Avinash_Nandyala_SDE_Entry.pdf |

PDFs live at. Re-export after dashboard ratings: in resume repo.

### Registered primary tracks (2026-09-02)

| Track id | PDF |
|----------|-----|
| agentic-engineer | Avinash_Nandyala_Agentic_Engineer.pdf |
| ai-engineer | Avinash_Nandyala_AI_Engineer.pdf |
| fde | Avinash_Nandyala_FDE.pdf |
| sde-mid | Avinash_Nandyala_SDE_Mid.pdf |
| robotics | Avinash_Nandyala_Robotics.pdf |
| mle | Avinash_Nandyala_MLE.pdf |

Config: · mirrored in primary_tracks. Software Development Engineer Entry excluded (new-grad only).

### Suggested default tracks (placeholder - edit before registering)

~~Per [knowledge/ROLE_COMPARISON.md](~/Projects/resume/knowledge/ROLE_COMPARISON.md), suggested primary pair until you pick explicitly:~~

**Superseded** - see Registered primary tracks above.

### After ratings

Once **81/81** bullets rated, Synced, and completes:

1. Read - compare best-for / hero projects / avoid per track
2. Pick **1–2 primary tracks** (e.g. Agentic Engineer + Artificial Intelligence Engineer)
3. Register defaults in Job Jugaad - wishlist rows should reference the matching `tracks/preview-pdf/Avinash_Nandyala_*.pdf` (config TBD: add default_resume_track field when tracker supports resume pick)
4. Kingdom Resume panel to verify PDF list + LinkedIn drafts before posting

Until ratings complete, use the comparison doc for planning only - do not mark the master resume goal complete.

## Deferred (not this pass)

Playwright headed apply, resume pick-only, Gmail IMAP OTP - see older Job Jugaad agent plan when ready.

## Related

- [[architecture/job-jugaad]]
- [[concepts/where-files-live]]
- [[ops/cloudflare-links]]
- [[concepts/agentic-interview-prep]]
- [[concepts/agentic-resume-gates]]
- [[concepts/agentic-stack-guidance]]
- [[concepts/resume-master-knowledge]]
