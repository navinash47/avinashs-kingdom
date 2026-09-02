#!/usr/bin/env node
/**
 * Ingest / compile stub — mechanical checklist matching brain/AGENTS.md.
 * The LLM (via kingdom-wiki skill) still does the reading/writing; this CLI
 * scaffolds raw filing + prints the compile steps so the workflow is real
 * and repeatable, not chat-only.
 *
 * Usage:
 *   node brain/harness/ingest.mjs --list
 *   node brain/harness/ingest.mjs --file path/to/source.md [--slug my-slug]
 *   node brain/harness/ingest.mjs --file path/to/source.md --scaffold
 *   npm run brain:ingest -- --list
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const brainRoot = path.join(__dirname, '..')
const inbox = path.join(brainRoot, 'raw', 'inbox')
const research = path.join(brainRoot, 'raw', 'research')
const sourcesDir = path.join(brainRoot, 'wiki', 'sources')

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

function printWorkflow(slug, rawRel) {
  const date = today()
  console.log(`# Ingest workflow (AGENTS.md) — ${slug}

1. Raw filed (immutable): ${rawRel ?? 'raw/inbox/<file>'}
2. Write wiki/sources/${slug}.md — summary, claims, limitations, [[links]]
3. Update related wiki/ventures/ · concepts/ · entities/ (create if needed)
4. System/IO → wiki/architecture/; try logs → wiki/experiments/
5. Update wiki/index.md catalog row
6. Append wiki/log.md:
   ## [${date}] ingest | <Title>
7. If panel-facing: npm run sync
8. Hygiene: npm run brain:lint

Skill: kingdom-wiki (mode: ingest). Do not edit filed raw files.
Secrets / contact dumps: never into brain/.
`)
}

if (flag('--list') || args.length === 0) {
  const items = listInbox()
  console.log(JSON.stringify({ raw_pending: items, next: 'brain:ingest --file <path> [--scaffold]' }, null, 2))
  if (!items.length) {
    console.error('\nNo pending files in raw/inbox or raw/research (aside from README). Drop a source, then re-run.')
  } else {
    console.error(`\n${items.length} raw file(s) ready. Pick one with --file and run kingdom-wiki ingest.`)
  }
  printWorkflow('<slug>', null)
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

printWorkflow(slug, rawRel)

if (flag('--scaffold')) {
  fs.mkdirSync(sourcesDir, { recursive: true })
  const dest = path.join(sourcesDir, `${slug}.md`)
  if (fs.existsSync(dest)) {
    console.error(`Source page exists (not overwritten): wiki/sources/${slug}.md`)
  } else {
    const body = `---
type: source
updated: ${today()}
tags: []
---

# ${slug}

**Raw:** \`${rawRel}\`

## Summary

_TODO — fill via kingdom-wiki ingest._

## Key claims

- 

## Limitations

- 

## Links

- 
`
    fs.writeFileSync(dest, body)
    console.error(`Scaffolded wiki/sources/${slug}.md — complete summary/claims, then update index + log.`)
  }
}

process.exit(0)
