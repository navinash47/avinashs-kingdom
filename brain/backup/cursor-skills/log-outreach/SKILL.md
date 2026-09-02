---
name: log-outreach
description: >-
  Log WhatsApp Agent Cash broker/pilot outreach touches in the outreach tracker.
  Use when adding a contact, recording a message/reply/call, updating pilot status,
  or when the user mentions outreach, brokers, LinkedIn pitch follow-up, or contacts.json.
---

# Log outreach

**Repo:** `/Users/avinashnandyala/Projects/whatsapp-voice-agents`  
**Tracker:** `outreach/tracker.mjs` · data: `outreach/contacts.json`

## Commands

From the WhatsApp repo:

```bash
# Add contact
npm run outreach:add -- --name "Name" --city Hyderabad --channel linkedin --profile "https://..." --note "..."

# Record a touch
npm run outreach:touch -- --id c-xxx --channel linkedin --status messaged --note "Sent pitch"

# List
npm run outreach:list
npm run outreach:list -- --status new
```

Valid statuses: `new`, `messaged`, `replied`, `call_booked`, `pilot`, `closed_no`, `closed_yes`.

## Rules

- Prefer the tracker over chat-only notes.
- Keep notes plain language; no secrets in git if sensitive — use short operational notes.
- If tracker or `package.json` scripts are missing, append a dated note under `outreach/` and tell the human to restore the tracker.
- After meaningful pipeline changes that affect STATUS, remind to run **sync-kingdom**.
