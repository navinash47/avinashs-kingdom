#!/usr/bin/env node
/**
 * Karpathy-style wiki health check for brain/wiki.
 *
 * Checks:
 *   - broken [[wiki-links]] / markdown links into wiki/
 *   - pages missing from wiki/index.md
 *   - orphan pages (no inbound wiki-links; index/overview/log exempt)
 *
 * Usage:
 *   node brain/harness/lint.mjs
 *   node brain/harness/lint.mjs --strict   # treat warnings as errors
 *   npm run brain:lint
 *
 * Exit 0 when healthy (or only warnings without --strict).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const brainRoot = path.join(__dirname, '..')
const wikiRoot = path.join(brainRoot, 'wiki')
const indexPath = path.join(wikiRoot, 'index.md')
const strict = process.argv.includes('--strict')

const EXEMPT_ORPHANS = new Set([
  'index.md',
  'overview.md',
  'log.md',
])

/** @type {Map<string, string>} relPath → absolute */
const pages = new Map()

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name.startsWith('.')) continue
    const abs = path.join(dir, ent.name)
    if (ent.isDirectory()) walk(abs)
    else if (ent.name.endsWith('.md')) {
      const rel = path.relative(wikiRoot, abs).split(path.sep).join('/')
      pages.set(rel, abs)
    }
  }
}

function stem(rel) {
  return rel.replace(/\.md$/i, '')
}

/** Resolve [[target]] from a page's directory. */
function resolveWikiLink(fromRel, raw) {
  let target = raw.trim()
  if (!target) return null
  // strip alias [[page|alias]]
  const pipe = target.indexOf('|')
  if (pipe >= 0) target = target.slice(0, pipe).trim()
  // strip heading [[page#heading]]
  const hash = target.indexOf('#')
  if (hash >= 0) target = target.slice(0, hash).trim()
  if (!target) return null

  target = target.replace(/\.md$/i, '')
  const fromDir = path.posix.dirname(fromRel)

  const candidates = []
  if (target.startsWith('wiki/')) {
    candidates.push(target.slice(5) + '.md')
  } else if (target.includes('/')) {
    candidates.push(target + '.md')
    if (fromDir !== '.') candidates.push(path.posix.join(fromDir, target) + '.md')
  } else {
    // bare slug: try same dir, then common roots
    if (fromDir !== '.') candidates.push(path.posix.join(fromDir, target) + '.md')
    candidates.push(target + '.md')
    for (const root of ['concepts', 'ventures', 'entities', 'sources', 'ops', 'architecture', 'experiments']) {
      candidates.push(`${root}/${target}.md`)
    }
  }

  for (const c of candidates) {
    const norm = path.posix.normalize(c)
    if (pages.has(norm)) return norm
  }
  return null
}

function collectIndexEntries(indexText) {
  const found = new Set()
  // markdown links: [label](path.md) or [label](concepts/foo.md)
  const mdLink = /\[[^\]]*]\(([^)]+\.md)(?:#[^)]*)?\)/g
  let m
  while ((m = mdLink.exec(indexText))) {
    let p = m[1].trim()
    if (p.startsWith('./')) p = p.slice(2)
    if (p.startsWith('/')) continue
    found.add(path.posix.normalize(p))
  }
  // wiki-links in index
  const wikiLink = /\[\[([^\]]+)\]\]/g
  while ((m = wikiLink.exec(indexText))) {
    const resolved = resolveWikiLink('index.md', m[1])
    if (resolved) found.add(resolved)
  }
  return found
}

walk(wikiRoot)

const broken = []
const inbound = new Map([...pages.keys()].map((k) => [k, 0]))

for (const [rel, abs] of pages) {
  const text = fs.readFileSync(abs, 'utf8')
  const wikiLink = /\[\[([^\]]+)\]\]/g
  let m
  while ((m = wikiLink.exec(text))) {
    const resolved = resolveWikiLink(rel, m[1])
    if (!resolved) {
      broken.push({ from: rel, link: `[[${m[1]}]]` })
    } else if (resolved !== rel) {
      inbound.set(resolved, (inbound.get(resolved) ?? 0) + 1)
    }
  }
  // relative md links into wiki (skip external / absolute / home paths)
  const mdLink = /\[[^\]]*]\(([^)]+)\)/g
  while ((m = mdLink.exec(text))) {
    let href = m[1].trim()
    if (/^(https?:|mailto:|#|\/|~)/i.test(href)) continue
    if (href.startsWith('./')) href = href.slice(2)
    const hash = href.indexOf('#')
    if (hash >= 0) href = href.slice(0, hash)
    if (!href.endsWith('.md')) continue
    // Only validate links that stay inside wiki/
    const joined = path.posix.normalize(
      path.posix.join(path.posix.dirname(rel), href),
    )
    if (joined.startsWith('..')) continue
    if (!pages.has(joined)) {
      broken.push({ from: rel, link: `(${m[1]})` })
    } else if (joined !== rel) {
      inbound.set(joined, (inbound.get(joined) ?? 0) + 1)
    }
  }
}

const indexText = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : ''
const indexed = collectIndexEntries(indexText)

const missingIndex = []
for (const rel of pages.keys()) {
  if (rel === 'index.md' || rel === 'log.md') continue
  if (!indexed.has(rel)) missingIndex.push(rel)
}

const orphans = []
for (const [rel, count] of inbound) {
  if (EXEMPT_ORPHANS.has(rel)) continue
  if (count === 0) orphans.push(rel)
}

const report = {
  wiki_pages: pages.size,
  broken_links: broken.length,
  missing_from_index: missingIndex.length,
  orphans: orphans.length,
  broken,
  missing_from_index_list: missingIndex.sort(),
  orphan_list: orphans.sort(),
}

console.log(JSON.stringify(report, null, 2))

const hasErrors = broken.length > 0
const hasWarnings = missingIndex.length > 0 || orphans.length > 0
if (hasErrors || (strict && hasWarnings)) {
  console.error(
    `\nlint failed: ${broken.length} broken, ${missingIndex.length} missing index, ${orphans.length} orphans` +
      (strict ? ' (--strict)' : ''),
  )
  process.exit(1)
}

if (hasWarnings) {
  console.error(
    `\nlint ok with warnings: ${missingIndex.length} missing index, ${orphans.length} orphans (use --strict to fail)`,
  )
} else {
  console.error(`\nlint ok: ${pages.size} pages, no broken links`)
}
process.exit(0)
