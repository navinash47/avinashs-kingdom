# Job Jugaad

AI apply agent: crawl many boards → SQLite track → pick **Avinash Resume (main)** unless specialized clearly wins → headed apply → Excel gaps / Q&A memory.

## Quick start

```bash
npm install
npm run index:resumes
npm run enrich:profile
npm run crawl:jobs              # ATS + web/Firecrawl → data/job-jugaad.sqlite
npm run crawl:linkedin          # optional headed LinkedIn listing harvest
npm run db:status
npm run auto:apply -- --limit 5 # apply best queued roles
npm run verify:mail
```

## Cursor automations

See [`automations.yaml`](automations.yaml). Suggested loop: crawl → db:status → auto:apply → verify:mail.

## Rules

- Main resume: `general` / `Avinash_Nandyala_Resume` (never edit files)
- Secrets prompted each run (no `.env`)
- LinkedIn: listings only — **no Easy Apply**
- Work auth defaults: F-1 OPT, sponsorship yes, legally authorized yes
