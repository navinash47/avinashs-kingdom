---
type: concept
updated: 2026-08-11
tags: [jobs, secrets, automation]
---

# Job Jugaad (concept)

Kingdom venture for AI-assisted job applications without rewriting resumes or storing secrets on disk.

## Claims

- Best fit among **existing** Desktop resume tracks is selected per JD; files are never mutated.
- Apply runs use **headed** Playwright; CAPTCHA/Cloudflare → pause for human, then resume.
- Gmail App Password + IMAP for OTP/verify links; credentials are **prompted every run** (memory-only).
- Failures and JD skill gaps land in Excel (`Company | Role | Chosen resume | Gap | Why | Learn next`).
- Text LLM + Firecrawl web fetch go through OmniRoute; Headroom compresses long JD/resume index context when available.

## Non-goals

- LinkedIn Easy Apply scraping.
- Cloudflare / bot-bypass packages.
- Persisting Gmail or API secrets in `.env` (Kingdom [[kingdom-secrets]] / `.cursor/rules/kingdom-secrets.mdc`).

## Related

- Venture: [[ventures/job-jugaad]]
- Ops: OmniRoute + [[ops/headroom]]
