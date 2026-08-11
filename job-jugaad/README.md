# Job Jugaad

AI apply agent: crawl many boards → SQLite track → pick **Avinash Resume (main)** unless specialized clearly wins → headed human-like apply → Excel/SQLite gaps / Q&A memory.

## Quick start

```bash
npm install
npm run index:resumes
npm run enrich:profile
npm run crawl:jobs              # ATS + web/Firecrawl → data/job-jugaad.sqlite
npm run crawl:linkedin:auth     # LinkedIn search (agent) — needs LI env for process
npm run db:status
npm run auto:apply -- --limit 3 # US full-time; ≤3 attempts / jid then manual-apply
npm run notify:digest           # email Cloudflare / not-applied links
npm run tick:15m                # crawl + apply + digest (15‑min automation)
npm run resume:waiting          # optional after you clear CAPTCHA in Cursor cloud
npm run verify:mail
npm run build:ui && npm run serve  # tracking UI :5178
```

## Cursor automations (every 15 minutes — not every minute)

See [`automations.yaml`](automations.yaml). Prefer **`npm run tick:15m`**.

| Cadence | Command |
|---------|---------|
| **Every 15 min** | `npm run tick:15m` (LinkedIn + Firecrawl crawl → apply ≤3× → digest email) |
| Hourly | `npm run verify:mail` / `npm run db:status` |

One-minute loops look more bot-like and re-trigger the same CAPTCHA.

## Retries → manual apply

- Same job id is attempted up to **3 times** (`JOB_JUGAAD_MAX_ATTEMPTS`, default 3).
- If still blocked (Cloudflare / CAPTCHA / no form) → status **`manual-apply`** (not applied).
- Every 15 min, **`notify:digest`** emails those Cloudflare / unapplied links so you can apply manually.
- Agent keeps doing LinkedIn search + web/Firecrawl crawl itself on that cadence.

## Chrome sandbox (`--no-sandbox`)

Playwright injects `--no-sandbox` unless you opt into the real Chromium sandbox.

Job Jugaad launches with **`chromiumSandbox: true`** (no `--no-sandbox`) via `src/apply/launch.ts`.  
If sandboxed launch fails in a locked-down container, it falls back once and logs it.

Force the old fingerprint only if needed: `JOB_JUGAAD_NO_SANDBOX=1`.

## CAPTCHA / take control

We do **not** use CAPTCHA-solving farms or Cloudflare bypass kits.

Default auto-apply **does not wait 10 minutes** on CAPTCHA (`JOB_JUGAAD_SKIP_HUMAN_WAIT=1`). It records the attempt, emails, and leaves the link for the digest.

Optional interactive path:

1. Set `JOB_JUGAAD_SKIP_HUMAN_WAIT=0` and clear CAPTCHA in Cursor cloud Chrome
2. `touch /tmp/job-jugaad-apply-continue` **or** `npm run resume:waiting`

Gmail notify needs `JOB_JUGAAD_GMAIL_USER` + `JOB_JUGAAD_GMAIL_APP_PASSWORD` for that process.

## Rules

- Main resume: `general` / `Avinash_Nandyala_Resume` (never edit files)
- US full-time only; never re-apply a **submitted** job URL
- Secrets prompted / process env each run (no `.env`)
- LinkedIn: listings only — **no Easy Apply**
- Work auth defaults: F-1 OPT, sponsorship yes, legally authorized yes
