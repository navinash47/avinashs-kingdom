# Job Jugaad

AI apply agent: crawl many boards → SQLite track → pick **Avinash Resume (main)** unless specialized clearly wins → headed human-like apply → Excel/SQLite gaps / Q&A memory.

## Quick start

```bash
npm install
npm run index:resumes
npm run enrich:profile
npm run crawl:jobs              # ATS + web/Firecrawl → data/job-jugaad.sqlite
npm run crawl:linkedin          # optional headed LinkedIn listing harvest
npm run db:status
npm run auto:apply -- --limit 3 # US full-time; skip duplicate URLs
npm run resume:waiting          # after you clear CAPTCHA in Cursor cloud
npm run verify:mail
npm run build:ui && npm run serve  # tracking UI :5178
```

## Cursor automations (every 15 minutes — not every minute)

See [`automations.yaml`](automations.yaml).

| Cadence | Command |
|---------|---------|
| Hourly | `npm run crawl:jobs` |
| **Every 15 min** | `npm run auto:apply -- --limit 3` |
| **Every 15 min** | `npm run resume:waiting -- --limit 5` |
| Hourly | `npm run verify:mail` |

One-minute loops look more bot-like and re-trigger the same CAPTCHA.

## CAPTCHA / take control

We do **not** use CAPTCHA-solving farms or Cloudflare bypass kits.

When a bot wall appears:

1. Job Jugaad emails `avinashnandyala2@gmail.com` (set `JOB_JUGAAD_GMAIL_USER` + `JOB_JUGAAD_GMAIL_APP_PASSWORD` for that process)
2. You take control of headed Chrome in **Cursor cloud desktop**
3. `touch /tmp/job-jugaad-apply-continue` **or** `npm run resume:waiting`

## Rules

- Main resume: `general` / `Avinash_Nandyala_Resume` (never edit files)
- US full-time only; never re-apply the same job URL
- Secrets prompted / process env each run (no `.env`)
- LinkedIn: listings only — **no Easy Apply**
- Work auth defaults: F-1 OPT, sponsorship yes, legally authorized yes
