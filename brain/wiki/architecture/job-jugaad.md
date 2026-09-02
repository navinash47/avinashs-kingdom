---
type: architecture
venture_id: job-jugaad
updated: 2026-08-24
---

# Job Jugaad architecture

## System design

Application tracker for FDE / AI Engineer roles. Tracker UI + API on :8790.

## Input / output flows

- **In:** wishlist rows, applied status updates
- **Out:** progress toward 30 applied+ target

## Data stores

| Store | Type | Path |
|-------|------|------|
| Applications | JSON | data/applications.json |

## Future plans

- Move first 5 wishlist → applied
- Resume-pick + headed apply automation
