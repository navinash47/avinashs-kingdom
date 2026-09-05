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
| **Resume knowledge** | - dashboard :5199 |
| **Kingdom mirror** | |

## Relationship to resume repo

- **Portfolio** = historical multi-track LaTeX (Agentic, Artificial Intelligence-Backend, Machine Learning Engineer, Software Development Engineer, Robotics, Java, Mix, Main, General) + GitHub Pages marketing site
- **resume** () = Phase 1 master knowledge, role-fit ratings, eval scores, export to new tracks
- Archive copies live at `resume/archive/portfolio-*` (from Portfolio resume, resumeGmail, resumeUmassMailId, resumeforanothermail)

Ingest (read-only):

```bash
cd ~/Projects/resume
npm run ingest-legacy
```

Dashboard **Legacy / Archive** tab compares extracted bullets vs current.

## Sync workflow

1. Kingdom - venture STATUS to manifests
2. Resume - manifests to featured_projects
3. Resume - ratings/approvals to 

See [[concepts/resume-master-knowledge]] and.

## Site

Static GitHub Pages - index.html + assets. No local dev server required; Kingdom links open the live site.

## Related

- [[concepts/resume-master-knowledge]]
- [[concepts/resume-master-knowledge]]
- [[concepts/agentic-resume-gates]]
- [[ventures/job-jugaad]]
- [[ops/git-repos]]
