# AGENTS.md

## Cursor Cloud specific instructions

`avinashs-kingdom` is a single-page **Vite + React 19 + TypeScript** dashboard (a personal command center for ventures, token burn, expenses, subscription/storage audits). There is no backend — the app boots from seed JSON committed under `public/data/` and persists user edits in the browser's `localStorage`.

### Services / commands

Standard scripts live in `package.json`; run them with `npm run <script>`:

- `dev` — Vite dev server on `http://localhost:5173` (`strictPort`, so the port must be free).
- `lint` — `oxlint`.
- `build` — `tsc -b && vite build`.
- `preview` — serve the production build.

### Non-obvious notes

- `npm run sync` (`scripts/sync-kingdom.mjs`) pulls data from sibling repos under `~/Projects/*`, `~/ProceduralCity`, and `~/ComicEngine`. Those repos do NOT exist in the cloud VM, so sync exits 0 but only prints "missing source" warnings **and rewrites tracked files** (`public/data/ventures.json`, `public/data/expenses.json`, `public/data/audits/*.json`, `STATUS.md`). Do not commit those churn-only edits — `git checkout -- STATUS.md public/data` to revert. Sync is not needed to run the app; the committed seed JSON is enough.
- The dashboard reads seed JSON at load, then keeps state in `localStorage`. Use the header **Reset seed** button to discard local edits and reload the committed seeds. **Export / Import** move state as JSON files.
- `npm install` may drop a few lines from `package-lock.json`; that churn is harmless and does not need to be committed.
