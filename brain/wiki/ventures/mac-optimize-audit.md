---
type: venture
updated: 2026-08-20
tags: [ops, janitor, mac]
---

# Mac optimize audit

- **Id:** mac-optimize-audit
- **Agent:** Agent Janitor
- **Weight:** 3% · **Priority:** P1
- **Repo:** 
- **Dashboard:** http://127.0.0.1:8742
- **Old sibling:** (disk-only, kept for history)

## Job

Find why this Air **stalls**, not only where disk went. Snapshot RAM, swap, memory pressure, hottest CPU, app groups (Zen plugin-containers roll up as Zen), login items, then offer **safe cleaners**.

## Why it stalls (audit 2026-08-20)

M5 MacBook Air, **16 GB RAM**, uptime **34 days**. Disk is fine (~44% on Data). The hitch is paging:

- Memory pressure **warning**, ~**1.5 GB swap**, millions of swap-ins
- **Structured.app** looping at ~100–220% CPU
- **Zen Browser** ~3.8 GB across ~28 processes
- **Cursor** ~3.6 GB (this session - do not force-quit from the tool)

Reboot is the real RAM reset after a month of compressor/swap. `sudo purge` is not a substitute.

## Commands

```bash
cd ~/Projects/mac-optimize-audit
python3 -m mac_optimize audit --deep
python3 -m mac_optimize serve # :8742
python3 -m mac_optimize clean --action quit_runaways --yes
```

Kingdom: **Mac** tab +. Dashboards script name: mac.

## Related

- [[architecture/mac-optimize-audit]]
- [[ops/steward-dashboard]]
- [[ventures/kingdom-ops]]
- [[concepts/where-files-live]]
