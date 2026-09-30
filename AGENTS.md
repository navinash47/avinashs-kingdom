# Kingdom (control plane)

This repo is the Venture Fleet control plane, not a copy of the apps.

- Wiki schema: `brain/AGENTS.md`. Catalog: `brain/wiki/index.md`.
- Registry: `config/venture-registry.json`.
- After STATUS / phases / expenses edits in any linked repo: `npm run sync` (needs unsandboxed filesystem so sibling repos are readable).
- Panel: `npm run dev` → http://localhost:5173/?tab=throne
- Fleet MCP smoke: `npm run mcp:smoke:fleet`
- Skills: `$sync-kingdom`, `$kingdom-wiki`, `$phase-gate`, `$kingdom-tunnels`, `$task-observer`, `$log-outreach`, `$youtube-provenance`.
- Do not put secrets or contact dumps in `brain/`.
