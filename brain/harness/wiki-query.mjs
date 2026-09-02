#!/usr/bin/env node
/**
 * Query the compiled wiki (Karpathy layer 2) — index-first keyword search.
 *
 * Usage:
 *   node brain/harness/wiki-query.mjs <terms…>
 *   node brain/harness/wiki-query.mjs --json personal OS
 *   npm run brain:query -- personal OS
 *
 * Prefer wiki over raw. For harness KG topology use: node brain/harness/query.mjs …
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const wikiRoot = path.join(__dirname, '..', 'wiki')
const indexPath = path.join(wikiRoot, 'index.md')

const args = process.argv.slice(2)
const asJson = args.includes('--json')
const terms = args.filter((a) => a !== '--json')

if (!terms.length) {
  console.error(`Usage: node brain/harness/wiki-query.mjs [--json] <search terms…>

Searches wiki/index.md then page bodies. Citations are vault-relative paths under brain/wiki/.
Harness graph: node brain/harness/query.mjs list`)
  process.exit(1)
}

const needle = terms.join(' ').toLowerCase()
const tokens = needle.split(/\s+/).filter(Boolean)

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name.startsWith('.')) continue
    const abs = path.join(dir, ent.name)
    if (ent.isDirectory()) walk(abs, out)
    else if (ent.name.endsWith('.md')) out.push(abs)
  }
  return out
}

function score(text, rel) {
  const lower = text.toLowerCase()
  let s = 0
  for (const t of tokens) {
    if (!t) continue
    if (rel.toLowerCase().includes(t)) s += 8
    const hits = lower.split(t).length - 1
    s += Math.min(hits, 12)
  }
  if (lower.includes(needle) && tokens.length > 1) s += 15
  return s
}

function snippet(text, max = 160) {
  const flat = text.replace(/\s+/g, ' ').trim()
  const idx = flat.toLowerCase().indexOf(tokens[0] ?? '')
  if (idx < 0) return flat.slice(0, max) + (flat.length > max ? '…' : '')
  const start = Math.max(0, idx - 40)
  return (start > 0 ? '…' : '') + flat.slice(start, start + max) + '…'
}

if (!fs.existsSync(indexPath)) {
  console.error('Missing wiki/index.md — brain vault incomplete')
  process.exit(1)
}

const indexText = fs.readFileSync(indexPath, 'utf8')
const files = walk(wikiRoot)
const hits = []

for (const abs of files) {
  const rel = path.relative(wikiRoot, abs).split(path.sep).join('/')
  const text = fs.readFileSync(abs, 'utf8')
  const s = score(text, rel)
  if (s <= 0) continue
  // Boost pages that appear in index rows matching terms
  let boost = 0
  if (score(indexText, 'index.md') > 0 && indexText.toLowerCase().includes(path.basename(rel, '.md').toLowerCase())) {
    boost = 3
  }
  hits.push({
    path: `brain/wiki/${rel}`,
    score: s + boost,
    snippet: snippet(text),
  })
}

hits.sort((a, b) => b.score - a.score)
const top = hits.slice(0, 12)

if (asJson) {
  console.log(JSON.stringify({ query: terms.join(' '), hits: top }, null, 2))
} else {
  console.log(`Query: ${terms.join(' ')}`)
  console.log(`Hits: ${top.length} (of ${hits.length} scored)\n`)
  if (!top.length) {
    console.log('No matches. Try broader terms or read brain/wiki/index.md.')
    process.exit(0)
  }
  for (const h of top) {
    console.log(`- ${h.path}  (score ${h.score})`)
    console.log(`  ${h.snippet}`)
    console.log()
  }
  console.log('Cite vault-relative paths above. File durable answers back via kingdom-wiki ingest.')
}

process.exit(0)
