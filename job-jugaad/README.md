# Job Jugaad

AI apply agent: read JD → pick best existing resume (never edit) → discover roles → headed Playwright apply → Gmail IMAP OTP (prompted each run) → Excel skill gaps on fail/low fit.

## Quick start

```bash
cd ~/Projects/job-jugaad   # or this folder
npm install
npm run index:resumes
npm run score:jd -- --file path/to/jd.txt
npm run discover
npm run apply              # prompts for Gmail address + App Password
npm run dev                # Job Jugaad UI
```

## Secrets

Do **not** put Gmail or API keys in `.env`. Job Jugaad asks interactively each run (Kingdom `kingdom-secrets` rule).

## OmniRoute

Keep OmniRoute on `:20128` for chat + Firecrawl web fetch.
