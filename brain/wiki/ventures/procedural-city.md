---
type: venture
updated: 2026-09-02
tags: [city, metro, p1]
---

# Procedural City

- **Id:** `procedural-city`
- **Agent:** Agent Metro
- **Weight:** 15% · **Priority:** P1 (before Comic)
- **Repo:** `~/ProceduralCity` (`https://github.com/navinash47/ProceduralCity.git`)

## Truth source

- Local / work branch: `tracking/phases.json` on `phase57` (Stage E gate prepared)
- Kingdom sync prefers **`origin/main`** when it has more phase passes than local
- Dashboard: `python3 scripts/serve_dashboard.py` to [http://127.0.0.1:8765/#proofs](http://127.0.0.1:8765/#proofs)

## Stage proofs / walkthroughs

Kingdom **Run** tab embeds the City dashboard at `/#proofs` and shows `CityStageProofsPanel` (synced from `dashboard/data.js` to `public/data/audits/city-stage-proofs.json`).

| Stage | Walkthrough | Notes |
|-------|-------------|-------|
| C | `reports/phase37_walkthrough.mp4` | 3×3 Unity geometry |
| D | `reports/phase47_walkthrough.mp4` | Streaming ≥25 tiles |
| E / E57 | `reports/phase57_walkthrough.mp4` | 1 km diagonal - **gate_closed=false** until human perfect-eval |

Phases E48–E56 also appear as stage-proof rows (terminals / verify JSON / SVGs).

## Live status (from sync)

See `public/data/ventures.json` / panel after `npm run sync`. Do **not** treat Stage E as closed until human perfect-eval.

## Job

Procedural city gates before ComicMainEngine. Control fal / Gemini spend.

## Related

- [[architecture/procedural-city]]
- [[experiments/procedural-city]]
- [[ventures/comic-engine]] (ComicMainEngine)
- Skills: **phase-gate**, **sync-kingdom**
