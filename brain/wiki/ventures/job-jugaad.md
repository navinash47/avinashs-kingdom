---
type: venture
updated: 2026-08-11
tags: [jobs, apply, p1]
---

# Job Jugaad

- **Id:** `job-jugaad`
- **Agent:** Agent Jugaad
- **Weight:** 5% · **Priority:** P1
- **Repo:** `~/Projects/job-jugaad` (see [[concepts/where-files-live]]; also `job-jugaad/` in Kingdom checkout while landing)
- **Live status:** Phase 0–3 scaffold · see STATUS.md
- **Budget:** token budget via Agent Jugaad ($25)

## Job

AI-first apply desk: read JD → **pick best existing resume** (never edit files) → discover company ATS roles → headed Playwright apply → Gmail OTP via live prompt → Excel skill gaps on fail/low fit.

## Rules

- Resumes read-only; CAPTCHA pauses for human; secrets prompted each run ([[concepts/job-jugaad]], kingdom-secrets rule).
- OmniRoute `:20128` for LLM + Firecrawl fetch. No Cloudflare bypass kits.

## Next milestones

1. Index Desktop resume library and score first JD → Excel gaps.  
2. Fill `config/companies.yaml` and run discover.  
3. Headed apply with Gmail prompt + CAPTCHA pause.

## Related

- [[concepts/job-jugaad]]
- Skills: **task-observer**, **sync-kingdom**, **phase-gate**
