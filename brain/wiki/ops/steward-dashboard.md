---
type: overview
updated: 2026-08-11
tags: [ops, steward, audits]
---

# Steward dashboard

Live numbers pulled into Kingdom via `npm run sync` (2026-08-11). Source JSON: `public/data/audits/`.

## Mac speed (optimize audit)

Live tool: `~/Projects/mac-optimize-audit` → http://127.0.0.1:8742  
Sync copy: `public/data/audits/mac-storage-summary.json`

| Metric | 2026-08-20 snapshot |
|--------|---------------------|
| Machine | M5 Air · 16 GB · 34 days up |
| Disk | ~44% on Data (not the stall) |
| Pressure | warning · ~1.5 GB swap |
| CPU villain | Structured.app ~100–220% |
| RAM hogs | Zen ~3.8 GB · Cursor ~3.6 GB |

Quit Structured, restart Zen, then **reboot** when you can save work. Cache cleaners are on the dashboard.

Legacy disk crawler (duplicates / iCloud): `~/Projects/mac-storage-audit`. Large home folders that are **not** the stall: `~/Library` ~83 GB, `~/.android` ~7 GB, Android SDK ~5 GB.

## Subscription kill list

| Metric | Value |
|--------|-------|
| Items | **6** |
| Annual estimate | **~$1,664** |
| Approx monthly sync-subs burn | **~$139** |
| Source | `~/Projects/subscription-audit/reports/latest-kill-list.txt` |

Canceled 2026-08-11 (verify by 2026-09-12): Comcast/Xfinity, Coursera, Jobright.ai, CSC laundry.

### Remaining seats (review / cancel)

| Name | Cadence | ~Annual |
|------|---------|---------|
| Cursor | ~$21.25 weekly | ~$1105 |
| OpenAI / ChatGPT Plus | ~$21 / mo | ~$255 |
| DoorDash DashPass | ~$10 / mo | ~$120 |
| Claude / Anthropic | irregular | ~$128 |
| Rocket Money | ~$3 / mo | ~$38 |
| Apple / iCloud | irregular | ~$18 |

Token / API portfolio cap (Kingdom ops): **≤ $250 / month** — separate from consumer subscriptions above.

## Next for Steward

1. Cancel or consciously keep each remaining kill-list seat.  
2. Mac stalls → [[ventures/mac-optimize-audit]] dashboard, not disk panic.  
3. Weekly Kingdom export.

Related: [[ventures/kingdom-ops]] · [[overview]]
