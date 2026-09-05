---
type: venture
updated: 2026-09-02
tags: [portfolio, resume, marketing]
---

# Portfolio (GitHub Pages)

Public portfolio site and **legacy LaTeX resume tracks** - connected to Kingdom and the resume knowledge repo.

## Links

| Resource | URL / path |
|----------|------------|
| **Site** | https://navinash47.github.io/Portfolio/ |
| **GitHub** | https://github.com/navinash47/Portfolio |
| **Local** | `~/Portfolio` |
| **Resume tracks** | `~/Portfolio/resume/*.tex` (read-only ingest) |
| **Resume knowledge** | `~/Projects/resume` - dashboard :5199 |
| **Kingdom mirror** | `public/data/portfolio-repo.json` |

## Relationship to resume repo

- **Portfolio** = historical multi-track LaTeX (Agentic, Artificial Intelligence-Backend, Machine Learning Engineer, Software Development Engineer, Robotics, Java, Mix, Main, General) + GitHub Pages marketing site
- **resume** (`~/Projects/resume`) = Phase 1 master knowledge, role-fit ratings, eval scores, export to new tracks
- Archive copies live at `resume/archive/portfolio-*` (from Portfolio `resume`, `resumeGmail`, `resumeUmassMailId`, `resumeforanothermail`)

Ingest (read-only):

```bash
cd ~/Projects/resume
npm run ingest-legacy
```

Dashboard **Legacy / Archive** tab compares extracted bullets vs current `knowledge/bullets/*`.

## Sync workflow

1. Kingdom `npm run sync` - venture STATUS to manifests
2. Resume `npm run sync-projects` - manifests to `knowledge/master.json` featured_projects
3. Resume `npm run sync:kingdom` - ratings/approvals to `public/data/resume-knowledge.json`

See [[concepts/resume-master-knowledge]] and `~/Projects/resume/knowledge/SYNC.md`.

## Site

Static GitHub Pages - `index.html` + assets. No local dev server required; Kingdom links open the live site.

## Related

- [[concepts/resume-master-knowledge]]
- [[concepts/resume-master-knowledge]]
- [[concepts/agentic-resume-gates]]
- [[ventures/job-jugaad]]
- [[ops/git-repos]]
