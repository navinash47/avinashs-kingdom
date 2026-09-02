---
name: career-rebrand
description: >-
  Sync multi-surface career packaging (resume, LinkedIn, Job Jugaad, Kingdom wiki)
  when rebranding or updating targeting. Use when the user mentions career rebrand,
  LinkedIn/bio sync, Track A/B resume refresh, Job Jugaad marketing copy, or
  keeping Portfolio and resume knowledge in sync.
---

# Career rebrand (internal)

Multi-surface packaging drifts unless updated in order. Never invent contact dumps into the wiki.

## Touch order (checklist)

Copy and tick:

```
- [ ] 1. Resume KB + ratings (source of truth for bullets)
      ~/Projects/resume — knowledge/, dashboard ratings, tracks/
- [ ] 2. Job Jugaad marketing + tracker
      ~/Projects/job-jugaad/CAREER_MARKETING.md
      ~/Projects/job-jugaad/STUDY.md (if study stack changed)
      data/applications.json wishlist rows (if targeting changed)
- [ ] 3. Portfolio site + legacy LaTeX (if still publishing Track A/B PDFs)
      ~/Portfolio resume .tex → Desktop PDFs (paths in CAREER_MARKETING.md)
- [ ] 4. LinkedIn (headline, About, Experience, Featured) — paste from CAREER_MARKETING
- [ ] 5. Kingdom wiki concepts (durable targeting language only)
      brain/wiki/concepts/agentic-interview-prep.md
      brain/wiki/concepts/agentic-resume-gates.md
      brain/wiki/concepts/resume-master-knowledge.md
      brain/wiki/ventures/job-jugaad.md / portfolio.md as needed
- [ ] 6. Sync Kingdom + resume mirror
```

## Commands

```bash
# After STATUS / applications / resume knowledge changes:
cd /Users/avinashnandyala/Projects/avinashs-kingdom && npm run sync

# Resume KB → Kingdom panel artifact:
cd ~/Projects/resume && npm run sync:kingdom
```

Rating workflow (do **not** auto-fill `ratings.json`): see `~/Projects/resume/knowledge/RATING_GUIDE.md` and Kingdom Resume panel “Rating guide”.

## Rules

- Update CAREER_MARKETING and wiki **together** when headline/positioning changes.
- Portfolio bio, LinkedIn About, and Track A summary must not contradict each other.
- Prefer resume KB + CAREER_MARKETING over chat memory for copy.
- No secrets, phone lists, or raw contact dumps in `brain/`.

## Pre-flight

- [ ] Same positioning string across LinkedIn headline ↔ CAREER_MARKETING ↔ Portfolio bio
- [ ] applications.json reflects current target roles/companies
- [ ] Wiki concepts updated if gates or study stack changed
- [ ] `npm run sync` (and resume `sync:kingdom` if ratings/export changed)
