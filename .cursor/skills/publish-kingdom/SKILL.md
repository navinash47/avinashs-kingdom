---
name: publish-kingdom
description: >-
  Sync, validate, deploy, and verify the Kingdom Vercel production site.
  Use when the user asks to publish or refresh the live Kingdom, Throne, Graph,
  Analytics, or other avinashs-kingdom.vercel.app pages. Do not use for a
  local-only Kingdom sync.
---

# Publish Kingdom

Internal skill for `/Users/avinashnandyala/Projects/avinashs-kingdom`.

## Authority boundary

- A request to **sync** authorizes the local `$sync-kingdom` workflow only.
- Deploy to Vercel only when the user explicitly asks to publish, deploy, or refresh the live site.
- Do not commit or push unless the user separately asks for Git changes.
- Never deploy if sync, lint, or build fails. Report the failing gate and stop.
- Do not relink the Vercel project, change production environment variables, or use a forced deployment unless the user explicitly asks.

## Workflow

Work from the Kingdom root:

```bash
cd /Users/avinashnandyala/Projects/avinashs-kingdom
```

1. Confirm `.vercel/project.json` exists and targets the Kingdom project.
2. Run `$sync-kingdom` with full filesystem access so every linked venture is read and all static snapshots are regenerated.
3. Run the local gates:

   ```bash
   npm run brain:lint
   npm run build
   ```

4. Record the local `synced_at` values from:
   - `public/data/skill-graph.json`
   - `public/data/control-surface.json`
5. With explicit production authorization, deploy from the linked project:

   ```bash
   npx vercel --prod
   ```

6. Verify the production page and JSON directly:
   - `https://avinashs-kingdom.vercel.app/?tab=graph`
   - `https://avinashs-kingdom.vercel.app/data/skill-graph.json`
   - `https://avinashs-kingdom.vercel.app/data/control-surface.json`
7. Confirm both production `synced_at` values equal their local counterparts. A successful Vercel command is insufficient if production still serves an older snapshot.

## Failure handling

- If Vercel authentication or project linkage is missing, report the exact blocker. Do not create or relink a project without explicit authorization.
- If deployment succeeds but timestamps remain stale, wait for the deployment to become ready and check once more. Do not loop deployments.
- If a JSON endpoint returns HTML, treat it as a routing failure and report it.

## Pre-flight check

Immediately before deploying, re-read **Authority boundary** and confirm:

- the user explicitly requested a production publish;
- sync, wiki lint, and build passed in this run;
- `.vercel/project.json` identifies the Kingdom project;
- the local timestamps were recorded for post-deploy comparison.

Report the deployment URL, the two local/production timestamp pairs, and PASS or FAIL. Mention that no commit or push occurred unless the user requested them.
