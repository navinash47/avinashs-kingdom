---
type: venture
updated: 2026-09-02
tags: [jobs, tracker, jugaad]
---

# Job Jugaad

- **Id:** `job-jugaad`
- **Agent:** Agent Jugaad (`agent-jugaad`)
- **Repo:** `~/Projects/job-jugaad`
- **Dashboard:** `http://127.0.0.1:8790` (Cloudflare tunnel via `npm run tunnels` / `jugaad`)
- **Status:** Tracker v0.1 · P1 · weight 8%

## What it is

Applications tracker: **company + specific role** through a pipeline (wishlist → applied → interviewing → offer / rejected / ghosted). File-backed at `data/applications.json`. Auto-updates `STATUS.md` progress as `applied-or-beyond / target` (default target 30).

## Sync

- Kingdom `npm run sync` reads `STATUS.md` + writes `public/data/audits/job-jugaad-applications.json`
- Progress formula: see [[ops/live-tracker]]

## Paths

| Path | Role |
|------|------|
| `data/applications.json` | Source of truth |
| `STATUS.md` | Kingdom progress |
| `server.mjs` | API + UI on :8790 |
| `apps/dashboard/` | Vite React board |

## Career targeting (2026-09-02)

- **Primary roles:** Applied AI Engineer, AI Agent Engineer, AI Software Engineer, FDE (Agentic) — pick 1–2 after role comparison
- **Resume knowledge:** `~/Projects/resume` — approval dashboard :5199 · [[concepts/resume-master-knowledge]]
- **Role comparison matrix:** `~/Projects/resume/knowledge/ROLE_COMPARISON.md` (best-for / hero projects / avoid — read before choosing primary track)
- **Seven export tracks:** `tracks/track-{role}.tex` → `tracks/preview-pdf/Avinash_Nandyala_*.pdf`
- **LinkedIn / bio copy:** `CAREER_MARKETING.md` in this repo
- **Wishlist:** 30 company+role rows seeded in `data/applications.json` (status `wishlist` — progress stays 0% until applied+)
- **Study:** [[concepts/agentic-interview-prep]] · claim gates: [[concepts/agentic-resume-gates]] · stack: [[concepts/agentic-stack-guidance]]

### Posting type → resume PDF

| Posting type / keywords | Recommended track PDF |
|-------------------------|------------------------|
| AI Agent, Agentic, multi-agent, tool use | `Avinash_Nandyala_Agentic_Engineer.pdf` |
| Applied AI, GenAI, LLM product engineer | `Avinash_Nandyala_AI_Engineer.pdf` |
| Forward Deployed, Solutions, customer engineer | `Avinash_Nandyala_FDE.pdf` (WhatsApp bullets unlock after Phase 8) |
| ML Engineer, training/eval, clinical ML | `Avinash_Nandyala_MLE.pdf` |
| Robotics, RL, simulation, Isaac, locomotion | `Avinash_Nandyala_Robotics.pdf` |
| Backend, platform, distributed systems (non-AI) | `Avinash_Nandyala_SDE_Mid.pdf` |
| SWE I, new grad, university recruiting | `Avinash_Nandyala_SDE_Entry.pdf` |

PDFs live at `~/Projects/resume/tracks/preview-pdf/`. Re-export after dashboard ratings: `npm run export` in resume repo.

### Registered primary tracks (2026-09-02)

| Track id | PDF |
|----------|-----|
| `agentic-engineer` | `Avinash_Nandyala_Agentic_Engineer.pdf` |
| `ai-engineer` | `Avinash_Nandyala_AI_Engineer.pdf` |
| `fde` | `Avinash_Nandyala_FDE.pdf` |
| `sde-mid` | `Avinash_Nandyala_SDE_Mid.pdf` |
| `robotics` | `Avinash_Nandyala_Robotics.pdf` |
| `mle` | `Avinash_Nandyala_MLE.pdf` |

Config: `~/Projects/job-jugaad/config/resume-tracks.json` · mirrored in `data/applications.json` `primary_tracks`. SDE Entry excluded (new-grad only).

### Suggested default tracks (placeholder — edit before registering)

~~Per [knowledge/ROLE_COMPARISON.md](~/Projects/resume/knowledge/ROLE_COMPARISON.md), suggested primary pair until you pick explicitly:~~

**Superseded** — see Registered primary tracks above.

### After ratings

Once **81/81** bullets rated, Synced, and `npm run finish:resume` completes:

1. Read `~/Projects/resume/knowledge/ROLE_COMPARISON.md` — compare best-for / hero projects / avoid per track
2. Pick **1–2 primary tracks** (e.g. Agentic Engineer + AI Engineer)
3. Register defaults in Job Jugaad — `data/applications.json` wishlist rows should reference the matching `tracks/preview-pdf/Avinash_Nandyala_*.pdf` (config TBD: add `default_resume_track` field when tracker supports resume pick)
4. Kingdom Resume panel → verify PDF list + LinkedIn drafts before posting

Until ratings complete, use the comparison doc for planning only — do not mark the master resume goal complete.

## Deferred (not this pass)

Playwright headed apply, resume pick-only, Gmail IMAP OTP — see older Job Jugaad agent plan when ready.

## Related

- [[architecture/job-jugaad]]
- [[concepts/where-files-live]]
- [[ops/cloudflare-links]]
- [[concepts/agentic-interview-prep]]
- [[concepts/agentic-resume-gates]]
- [[concepts/agentic-stack-guidance]]
- [[concepts/resume-master-knowledge]]
