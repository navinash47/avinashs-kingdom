#!/usr/bin/env node
/**
 * Semi-auto ingest — mechanical happy path for brain/AGENTS.md.
 *
 * What this CLI does (deterministic):
 *   - list raw/inbox + raw/research
 *   - file a copy under raw/inbox when --file is outside brain/raw
 *   - scaffold wiki/sources/<slug>.md (default on --file; use --no-scaffold to skip)
 *   - print an exact index/log checklist with copy-pasteable lines
 *
 * What stays manual / agent (kingdom-wiki ingest):
 *   - reading the source, writing summary/claims, updating related pages
 *   - full LLM compile into ventures/concepts/entities
 *
 * Usage:
 *   node brain/harness/ingest.mjs --list
 *   node brain/harness/ingest.mjs --file path/to/source.md [--slug my-slug]
 *   node brain/harness/ingest.mjs --file path/to/source.md --no-scaffold
 *   npm run brain:ingest -- --list
 *   npm run brain:ingest -- --file brain/raw/inbox/foo.md
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const brainRoot = path.join(__dirname, '..')
const inbox = path.join(brainRoot, 'raw', 'inbox')
const research = path.join(brainRoot, 'raw', 'research')
const sourcesDir = path.join(brainRoot, 'wiki', 'sources')
const indexPath = path.join(brainRoot, 'wiki', 'index.md')
const logPath = path.join(brainRoot, 'wiki', 'log.md')

const args = process.argv.slice(2)
function flag(name) {
  return args.includes(name)
}
function opt(name) {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : null
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/\.md$/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

function listInbox() {
  const dirs = [
    ['inbox', inbox],
    ['research', research],
  ]
  const out = []
  for (const [label, dir] of dirs) {
    if (!fs.existsSync(dir)) continue
    for (const name of fs.readdirSync(dir)) {
      if (name.startsWith('.') || name === 'README.md') continue
      const abs = path.join(dir, name)
      if (!fs.statSync(abs).isFile()) continue
      out.push({ bucket: label, file: name, path: path.relative(brainRoot, abs) })
    }
  }
  return out
}

function titleFromSlug(slug) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

/**
 * Exact mechanical checklist — paths and paste lines, not vague advice.
 */
function printChecklist({ slug, rawRel, sourceRel, sourceCreated, title }) {
  const date = today()
  const displayTitle = title || titleFromSlug(slug)
  const indexRow = `| [${displayTitle}](sources/${slug}.md) | source | _one-line summary_ |`
  const logEntry = `## [${date}] ingest | ${displayTitle}`

  console.log(`# Ingest checklist (mechanical) — ${slug}

## Done by this CLI
1. Raw filed (immutable): \`${rawRel}\`
2. Source stub: \`${sourceRel}\`${sourceCreated ? ' (created)' : ' (already existed — not overwritten)'}

## Agent / human next (kingdom-wiki ingest — LLM compile)
3. Fill \`wiki/sources/${slug}.md\` — Summary, Key claims, Limitations, [[links]]
4. Update related \`wiki/ventures/\` · \`concepts/\` · \`entities/\` (create if needed)
5. System/IO → \`wiki/architecture/\`; try logs → \`wiki/experiments/\`

## Exact catalog + log edits
6. Add a row to \`wiki/index.md\` (Sources section), e.g.:
   ${indexRow}
7. Append to \`wiki/log.md\`:
   ${logEntry}
   <one sentence: what was ingested and which pages updated>

## Hygiene
8. If panel-facing STATUS/phases/expenses moved: \`npm run sync\`
9. \`npm run brain:lint\`

Skill: kingdom-wiki (mode: ingest). Do not edit filed raw files.
Secrets / contact dumps: never into brain/.
Full LLM compile is intentionally NOT automated here.
`)
}

if (flag('--list') || args.length === 0) {
  const items = listInbox()
  console.log(
    JSON.stringify(
      {
        raw_pending: items,
        happy_path: 'npm run brain:ingest -- --file <path> [--slug my-slug]',
        note: '--file scaffolds wiki/sources/<slug>.md by default; --no-scaffold skips stub',
      },
      null,
      2,
    ),
  )
  if (!items.length) {
    console.error(
      '\nNo pending files in raw/inbox or raw/research (aside from README). Drop a source, then:\n  npm run brain:ingest -- --file brain/raw/inbox/<file>.md',
    )
  } else {
    console.error(
      `\n${items.length} raw file(s) ready. Happy path:\n  npm run brain:ingest -- --file ${items[0].path}`,
    )
  }
  process.exit(0)
}

const fileArg = opt('--file')
if (!fileArg) {
  console.error('Need --list or --file <path>')
  process.exit(1)
}

const abs = path.isAbsolute(fileArg) ? fileArg : path.resolve(process.cwd(), fileArg)
if (!fs.existsSync(abs)) {
  console.error(`File not found: ${abs}`)
  process.exit(1)
}

const base = path.basename(abs)
const slug = slugify(opt('--slug') || base)
let rawRel = path.relative(brainRoot, abs)

// Copy into inbox if outside brain/raw
const underRaw = abs.startsWith(path.join(brainRoot, 'raw') + path.sep)
if (!underRaw) {
  fs.mkdirSync(inbox, { recursive: true })
  const dest = path.join(inbox, base)
  if (!fs.existsSync(dest)) {
    fs.copyFileSync(abs, dest)
    console.error(`Filed immutable copy → brain/raw/inbox/${base}`)
  } else {
    console.error(`Already in inbox: ${base} (left untouched)`)
  }
  rawRel = `raw/inbox/${base}`
}

const noScaffold = flag('--no-scaffold')
// Happy path: scaffold by default (--scaffold kept as explicit alias)
const doScaffold = !noScaffold
let sourceCreated = false
const sourceRel = `wiki/sources/${slug}.md`
const sourceAbs = path.join(sourcesDir, `${slug}.md`)

if (doScaffold) {
  fs.mkdirSync(sourcesDir, { recursive: true })
  if (fs.existsSync(sourceAbs)) {
    console.error(`Source page exists (not overwritten): ${sourceRel}`)
  } else {
    const title = titleFromSlug(slug)
    const body = `---
type: source
updated: ${today()}
tags: []
---

# ${title}

**Raw:** \`${rawRel}\`

## Summary

_TODO — fill via kingdom-wiki ingest (LLM compile)._

## Key claims

- 

## Limitations

- 

## Links

- [[index]]
`
    fs.writeFileSync(sourceAbs, body)
    sourceCreated = true
    console.error(`Scaffolded ${sourceRel}`)
  }
} else {
  console.error('Skipped source scaffold (--no-scaffold)')
}

printChecklist({
  slug,
  rawRel,
  sourceRel,
  sourceCreated: doScaffold ? sourceCreated : false,
  title: titleFromSlug(slug),
})

// Machine-readable companion for agents
console.log(
  JSON.stringify(
    {
      ok: true,
      slug,
      raw: rawRel,
      source: sourceRel,
      source_created: sourceCreated,
      scaffolded: doScaffold,
      index_path: path.relative(brainRoot, indexPath),
      log_path: path.relative(brainRoot, logPath),
      next: [
        `Fill ${sourceRel} summary/claims`,
        'Update related wiki pages',
        `Add index row for sources/${slug}.md`,
        `Append log: ## [${today()}] ingest | ${titleFromSlug(slug)}`,
        'npm run brain:lint',
      ],
    },
    null,
    2,
  ),
)

process.exit(0)
