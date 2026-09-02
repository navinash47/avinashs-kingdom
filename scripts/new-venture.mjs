#!/usr/bin/env node
/**
 * Mechanical onboarding from config/venture-template.json → registry + wiki stubs.
 *
 * Usage:
 *   node scripts/new-venture.mjs --id my-venture --repo ~/Projects/my-venture --agent agent-mine
 *   node scripts/new-venture.mjs --id my-venture --repo ~/Projects/my-venture --agent agent-mine --write
 *   node scripts/new-venture.mjs --id lab --repo ~/Projects/lab --agent agent-lab --kind research --field "comics"
 *
 * Default is dry-run (prints plan). --write mutates registry + wiki stubs.
 * Still required after --write: AGENT_SKILL_MAP + npm run sync (see checklist).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadRegistry, loadVentureTemplate } from './lib/registry.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const kingdomRoot = path.join(__dirname, '..')

const args = process.argv.slice(2)
function opt(name) {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : null
}
const write = args.includes('--write')
const id = opt('--id')
const repoPath = opt('--repo') || opt('--repoPath')
const agentId = opt('--agent') || opt('--agentId')
const kind = opt('--kind')
const field = opt('--field')

if (!id || !repoPath || !agentId) {
  console.error(`Usage: node scripts/new-venture.mjs --id <slug> --repo <~/Projects/slug> --agent <agent-id> [--kind research] [--field "..."] [--write]

Dry-run by default. See brain/wiki/concepts/onboard-new-project.md`)
  process.exit(1)
}

if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) {
  console.error('id must be lowercase slug (a-z, 0-9, hyphens)')
  process.exit(1)
}

const template = loadVentureTemplate(kingdomRoot)
if (!template?.venture) {
  console.error('Missing config/venture-template.json')
  process.exit(1)
}

const registryPath = path.join(kingdomRoot, 'config', 'venture-registry.json')
const registry = loadRegistry(kingdomRoot)
if ((registry.ventures ?? []).some((v) => v.id === id)) {
  console.error(`Venture already in registry: ${id}`)
  process.exit(1)
}

const venture = structuredClone(template.venture)
venture.id = id
venture.repoPath = repoPath
venture.agentId = agentId
venture.kind = kind || null
venture.field = field || null
venture.wiki = {
  venture: `brain/wiki/ventures/${id}.md`,
  architecture: `brain/wiki/architecture/${id}.md`,
  experiments: `brain/wiki/experiments/${id}.md`,
}
if (venture.github) {
  venture.github.repo = id
}

const today = new Date().toISOString().slice(0, 10)
const wikiPages = [
  {
    rel: venture.wiki.venture,
    body: `---
type: venture
updated: ${today}
tags: [${id}]
---

# ${id}

**Repo:** \`${repoPath}\` · **Agent:** \`${agentId}\`

## Status

_Stub — fill from STATUS.md after first sync._

## Links

- Architecture: [[architecture/${id}]]
- Experiments: [[experiments/${id}]]
- OS: [[concepts/kingdom-personal-os]]
- Onboard: [[concepts/onboard-new-project]]
`,
  },
  {
    rel: venture.wiki.architecture,
    body: `---
type: concept
updated: ${today}
tags: [architecture, ${id}]
---

# ${id} architecture

\`\`\`mermaid
flowchart LR
  repo[${id}] --> status[STATUS.md]
  status --> sync[npm run sync]
  sync --> throne[Throne]
\`\`\`

## Notes

_Stub — document IO / agents / ports._
`,
  },
  {
    rel: venture.wiki.experiments,
    body: `---
type: concept
updated: ${today}
tags: [experiments, ${id}]
---

# ${id} experiments

| Date | Try | Result |
|------|-----|--------|
| ${today} | onboard stub | created |

`,
  },
]

const plan = {
  dry_run: !write,
  venture,
  wiki_pages: wikiPages.map((p) => p.rel),
  after_write: [
    `Add AGENT_SKILL_MAP['${agentId}'] in scripts/lib/skill-graph.mjs (at least sync-kingdom)`,
    'Update brain/wiki/concepts/where-files-live.md',
    'Add catalog rows to brain/wiki/index.md + log entry',
    'Update sync-kingdom skill path map if outside known roots',
    'npm run sync',
    'npm run brain:lint',
    'Verify /?tab=throne + node brain/harness/query.mjs neighbors venture:' + id,
  ],
  orchestrator_after_register: template.orchestrator_contract?.after_register ?? [],
}

console.log(JSON.stringify(plan, null, 2))

if (!write) {
  console.error('\nDry-run only. Re-run with --write to append registry + create wiki stubs.')
  process.exit(0)
}

registry.ventures = registry.ventures ?? []
registry.ventures.push(venture)
registry.updated = today
fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2) + '\n')

for (const page of wikiPages) {
  const abs = path.join(kingdomRoot, page.rel)
  fs.mkdirSync(path.dirname(abs), { recursive: true })
  if (fs.existsSync(abs)) {
    console.error(`Skip existing ${page.rel}`)
  } else {
    fs.writeFileSync(abs, page.body)
    console.error(`Wrote ${page.rel}`)
  }
}

console.error(`\nWrote registry row for ${id}. Finish AGENT_SKILL_MAP + index/log, then npm run sync.`)
process.exit(0)
