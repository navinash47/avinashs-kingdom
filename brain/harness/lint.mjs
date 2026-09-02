#!/usr/bin/env node
/**
 * Karpathy-style wiki health check for brain/wiki — heuristic v2.
 *
 * This is a deterministic CLI, NOT an LLM contradiction / claim judge.
 * It catches structural issues (broken links, orphans, missing index)
 * plus light heuristics (stale/missing updated:, duplicate titles,
 * duplicate venture_id claims, conflicting lifecycle phrases across a
 * venture's pages, duplicate bullet claims, updated: lagging recent
 * wiki/log mentions).
 *
 * Checks:
 *   ERRORS:   broken [[wiki-links]] / markdown links into wiki/
 *   WARNINGS: missing from index, orphans, missing/stale updated:,
 *             duplicate H1 titles, duplicate venture_id frontmatter,
 *             conflicting venture status phrases, duplicate claims,
 *             very stale updated vs recent log activity
 *
 * Usage:
 *   node brain/harness/lint.mjs
 *   node brain/harness/lint.mjs --strict          # warnings → exit 1
 *   node brain/harness/lint.mjs --stale-days 90   # default 90
 *   node brain/harness/lint.mjs --log-lag-days 14 # updated vs log mention (default 14)
 *   npm run brain:lint
 *
 * Exit 0 when healthy or only warnings (without --strict).
 * Exit 1 on broken links, or any warning under --strict.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const brainRoot = path.join(__dirname, '..')
const wikiRoot = path.join(brainRoot, 'wiki')
const indexPath = path.join(wikiRoot, 'index.md')
const logPath = path.join(wikiRoot, 'log.md')
const strict = process.argv.includes('--strict')

function optInt(name, fallback) {
  const i = process.argv.indexOf(name)
  if (i < 0) return fallback
  const n = Number(process.argv[i + 1])
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback
}

const staleDays = optInt('--stale-days', 90)
const logLagDays = optInt('--log-lag-days', 14)

const EXEMPT_ORPHANS = new Set([
  'index.md',
  'overview.md',
  'log.md',
  'drafts/README.md',
])

const EXEMPT_UPDATED = new Set([
  'index.md',
  'log.md',
])

/** Lifecycle tokens that conflict when both appear across a venture's pages. */
const LIFECYCLE_GROUPS = [
  new Set(['active', 'in progress', 'shipping']),
  new Set(['parked', 'paused', 'on hold', 'do not focus', 'dormant']),
  new Set(['archived', 'retired', 'killed', 'deprecated', 'cancelled', 'canceled']),
  new Set(['complete', 'completed', 'done', 'shipped']),
  new Set(['blocked', 'waiting']),
]

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

/** Parse YAML-ish frontmatter between --- fences (best-effort). */
function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!m) return { raw: null, fields: /** @type {Record<string, string>} */ ({}) }
  const fields = {}
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/)
    if (!kv) continue
    let v = kv[2].trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    // skip arrays / nested for heuristic v2
    if (v.startsWith('[') || v.startsWith('{')) continue
    fields[kv[1]] = v
  }
  return { raw: m[1], fields }
}

function bodyText(text) {
  return text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '')
}

function firstH1(text) {
  const body = bodyText(text)
  const m = body.match(/^#\s+(.+)$/m)
  return m ? m[1].trim().replace(/\s+/g, ' ') : null
}

function latestLogDate(logText) {
  let best = null
  const re = /^##\s+\[(\d{4}-\d{2}-\d{2})\]/gm
  let m
  while ((m = re.exec(logText))) {
    if (!best || m[1] > best) best = m[1]
  }
  return best
}

/** @returns {{ date: string, title: string, body: string }[]} */
function parseLogEntries(logText) {
  const entries = []
  const re = /^##\s+\[(\d{4}-\d{2}-\d{2})\]\s+(.+)$/gm
  const matches = [...logText.matchAll(re)]
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i]
    const start = m.index + m[0].length
    const end = i + 1 < matches.length ? matches[i + 1].index : logText.length
    entries.push({
      date: m[1],
      title: m[2].trim(),
      body: logText.slice(start, end),
    })
  }
  return entries
}

function daysBetween(isoA, isoB) {
  const a = Date.parse(`${isoA}T00:00:00Z`)
  const b = Date.parse(`${isoB}T00:00:00Z`)
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null
  return Math.floor((b - a) / 86_400_000)
}

function stripMdLite(s) {
  return s
    .replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Cheap lifecycle / status phrase scrape (warnings only — not semantic truth).
 * Prefer Status:/census-cell contexts so prose like "A0 complete" or
 * "ratings complete" does not collide with "active" / "in progress".
 * @returns {Set<string>}
 */
function extractLifecyclePhrases(text) {
  const body = bodyText(text)
  const found = new Set()
  const statusToken =
    'parked|paused|archived|retired|killed|deprecated|cancelled|canceled|blocked|dormant|active|complete|completed|shipping|shipped|done'
  for (const line of body.split(/\r?\n/)) {
    const low = line.toLowerCase()
    let m
    const statusField = /\bstatus\s*:\s*\**\s*([a-z][a-z _-]{1,40})/gi
    while ((m = statusField.exec(line))) {
      const phrase = m[1].trim().replace(/\s+/g, ' ').replace(/[.,;:]+$/, '')
      if (phrase.length >= 2 && phrase.length <= 40) found.add(phrase.toLowerCase())
    }
    if (/\bdo not focus\b/i.test(line)) found.add('do not focus')
    if (/\bon hold\b/i.test(line)) found.add('on hold')
    // Census / table cells: "P1 · active", "| parked |", "· shipping"
    const cellRe = new RegExp(
      `(?:^|[|·•,]\\s*|\\bp[0-3]\\s*·\\s*)(${statusToken})\\b`,
      'gi',
    )
    while ((m = cellRe.exec(line))) {
      found.add(m[1].toLowerCase())
    }
    // "in progress" only on status/priority-ish lines (not random prose)
    if (
      /\b(status|priority)\b/i.test(line) &&
      /\bin progress\b/i.test(line)
    ) {
      found.add('in progress')
    }
    // Priority tokens on census-like lines
    if (/[|·]/.test(line) || /\bpriority\b/i.test(line) || /\bp[0-3]\s*·/i.test(line)) {
      const pri = /\b(p[0-3])\b/gi
      while ((m = pri.exec(low))) found.add(m[1].toLowerCase())
    }
  }
  return found
}

function lifecycleGroupIndex(phrase) {
  for (let i = 0; i < LIFECYCLE_GROUPS.length; i++) {
    if (LIFECYCLE_GROUPS[i].has(phrase)) return i
  }
  return -1
}

/**
 * Extract claim-like bullets (substantial list items).
 * @returns {string[]}
 */
function extractClaimBullets(text) {
  const body = bodyText(text)
  const claims = []
  for (const line of body.split(/\r?\n/)) {
    const m = line.match(/^\s*[-*]\s+(.+)$/)
    if (!m) continue
    const raw = stripMdLite(m[1])
    // Raise floor + skip path/wiki-stub bullets (link echoes, not claims)
    if (raw.length < 64) continue
    if (/^_?todo|_?tbd|fill via|one-line summary/i.test(raw)) continue
    if (/^\[.*\]\(.*\)$/.test(raw)) continue
    if (/^(sources|concepts|ventures|entities|ops|architecture|experiments|wiki)\//i.test(raw)) {
      continue
    }
    if (/^[a-z0-9_./-]+$/i.test(raw) && raw.includes('/')) continue
    claims.push(raw)
  }
  return claims
}

walk(wikiRoot)

const broken = []
const inbound = new Map([...pages.keys()].map((k) => [k, 0]))
/** @type {Map<string, { abs: string, text: string, fm: Record<string, string>, title: string | null }>} */
const pageMeta = new Map()

for (const [rel, abs] of pages) {
  const text = fs.readFileSync(abs, 'utf8')
  const { fields } = parseFrontmatter(text)
  pageMeta.set(rel, { abs, text, fm: fields, title: firstH1(text) })

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
const logText = fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf8') : ''
const logLatest = latestLogDate(logText)
const logEntries = parseLogEntries(logText)
const today = new Date().toISOString().slice(0, 10)
const staleAnchor = logLatest ?? today

const missingIndex = []
for (const rel of pages.keys()) {
  if (rel === 'index.md' || rel === 'log.md') continue
  if (rel.startsWith('drafts/')) continue // unpublished auto-wiki drafts
  if (!indexed.has(rel)) missingIndex.push(rel)
}

const orphans = []
for (const [rel, count] of inbound) {
  if (EXEMPT_ORPHANS.has(rel)) continue
  if (rel.startsWith('drafts/')) continue
  if (count === 0) orphans.push(rel)
}

/** @type {{ page: string, reason: string, updated?: string | null }[]} */
const staleUpdated = []
for (const [rel, meta] of pageMeta) {
  if (EXEMPT_UPDATED.has(rel)) continue
  const updated = meta.fm.updated || null
  if (!updated) {
    staleUpdated.push({ page: rel, reason: 'missing_updated', updated: null })
    continue
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(updated)) {
    staleUpdated.push({ page: rel, reason: 'invalid_updated', updated })
    continue
  }
  const age = daysBetween(updated, staleAnchor)
  if (age != null && age > staleDays) {
    staleUpdated.push({
      page: rel,
      reason: `stale_vs_log_or_today (>${staleDays}d)`,
      updated,
    })
  }
}

/** Duplicate H1 titles (case-insensitive). */
const titleBuckets = new Map()
for (const [rel, meta] of pageMeta) {
  if (!meta.title) continue
  const key = meta.title.toLowerCase()
  if (!titleBuckets.has(key)) titleBuckets.set(key, [])
  titleBuckets.get(key).push(rel)
}
const duplicateTitles = [...titleBuckets.entries()]
  .filter(([, list]) => list.length > 1)
  .map(([title, pagesList]) => ({ title, pages: pagesList.sort() }))
  .sort((a, b) => a.title.localeCompare(b.title))

/**
 * Duplicate / conflicting venture signals (cheap):
 * - same venture_id on 2+ pages under ventures/ (architecture/experiments sharing
 *   venture_id with ventures/<id> is intentional — not a warning)
 * - ventures|architecture|experiments/<id>.md basename disagrees with frontmatter venture_id
 * - architecture|experiments/<id>.md with no matching ventures/<id>.md
 */
const ventureIdBuckets = new Map()
const venturePathMismatch = []
const orphanVentureSatellites = []
for (const [rel, meta] of pageMeta) {
  const vid = meta.fm.venture_id || null
  if (vid && rel.startsWith('ventures/')) {
    if (!ventureIdBuckets.has(vid)) ventureIdBuckets.set(vid, [])
    ventureIdBuckets.get(vid).push(rel)
  }
  const m = rel.match(/^(ventures|architecture|experiments)\/([^/]+)\.md$/i)
  if (m) {
    const [, folder, pathId] = m
    if (vid && vid !== pathId) {
      venturePathMismatch.push({
        page: rel,
        path_id: pathId,
        venture_id: vid,
        reason: 'frontmatter_venture_id_ne_path',
      })
    }
    if ((folder === 'architecture' || folder === 'experiments') && !pages.has(`ventures/${pathId}.md`)) {
      orphanVentureSatellites.push({
        page: rel,
        expected_venture_page: `ventures/${pathId}.md`,
        reason: 'satellite_without_venture_page',
      })
    }
  }
}
const duplicateVentureIds = [...ventureIdBuckets.entries()]
  .filter(([, list]) => list.length > 1)
  .map(([venture_id, pagesList]) => ({ venture_id, pages: pagesList.sort() }))
  .sort((a, b) => a.venture_id.localeCompare(b.venture_id))

/** Same basename under ventures/ + concepts/ claiming identical title (cheap dupe-topic). */
const basenameTitles = new Map()
for (const [rel, meta] of pageMeta) {
  const base = path.posix.basename(stem(rel))
  if (!meta.title) continue
  const key = `${base}::${meta.title.toLowerCase()}`
  if (!basenameTitles.has(key)) basenameTitles.set(key, [])
  basenameTitles.get(key).push(rel)
}
const duplicateTopics = [...basenameTitles.entries()]
  .filter(([, list]) => {
    if (list.length < 2) return false
    const dirs = new Set(list.map((p) => path.posix.dirname(p)))
    return dirs.size > 1
  })
  .map(([key, pagesList]) => {
    const [basename, title] = key.split('::')
    return { basename, title, pages: pagesList.sort() }
  })

/**
 * v2: conflicting lifecycle phrases across ventures|architecture|experiments/<id>.md.
 * live-tracker is auto census ("P1 · active" for almost every row) — exclude it
 * from lifecycle scrape so it does not false-conflict with venture prose.
 */
const venturePageSets = new Map()
for (const rel of pages.keys()) {
  const m = rel.match(/^(ventures|architecture|experiments)\/([^/]+)\.md$/i)
  if (!m) continue
  const id = m[2]
  if (!venturePageSets.has(id)) venturePageSets.set(id, [])
  venturePageSets.get(id).push(rel)
}
const conflictingVentureStatus = []
for (const [ventureId, rels] of venturePageSets) {
  const pagesInScope = [...rels]

  /** @type {Map<string, Set<string>>} phrase → pages */
  const phrasePages = new Map()
  /** @type {Map<string, Set<string>>} priority → pages */
  const priorityPages = new Map()

  for (const rel of pagesInScope) {
    const meta = pageMeta.get(rel)
    if (!meta) continue
    const text = meta.text
    const phrases = extractLifecyclePhrases(text)
    for (const p of phrases) {
      if (/^p[0-3]$/.test(p)) {
        if (!priorityPages.has(p)) priorityPages.set(p, new Set())
        priorityPages.get(p).add(rel)
        continue
      }
      if (!phrasePages.has(p)) phrasePages.set(p, new Set())
      phrasePages.get(p).add(rel)
    }
  }

  const groupHits = new Map() // groupIdx → { phrases, pages }
  for (const [phrase, pageSet] of phrasePages) {
    const gi = lifecycleGroupIndex(phrase)
    if (gi < 0) continue
    if (!groupHits.has(gi)) groupHits.set(gi, { phrases: new Set(), pages: new Set() })
    groupHits.get(gi).phrases.add(phrase)
    for (const p of pageSet) groupHits.get(gi).pages.add(p)
  }
  if (groupHits.size >= 2) {
    const groups = [...groupHits.entries()].map(([gi, v]) => ({
      group: [...LIFECYCLE_GROUPS[gi]][0],
      phrases: [...v.phrases].sort(),
      pages: [...v.pages].sort(),
    }))
    conflictingVentureStatus.push({
      venture_id: ventureId,
      reason: 'conflicting_lifecycle_phrases',
      groups,
    })
  }

  if (priorityPages.size >= 2) {
    conflictingVentureStatus.push({
      venture_id: ventureId,
      reason: 'conflicting_priority_tokens',
      priorities: [...priorityPages.entries()].map(([p, set]) => ({
        priority: p,
        pages: [...set].sort(),
      })),
    })
  }
}
conflictingVentureStatus.sort((a, b) => a.venture_id.localeCompare(b.venture_id))

/**
 * v2: duplicate claim bullets (normalized exact match across ≥2 pages).
 */
const claimBuckets = new Map()
for (const [rel, meta] of pageMeta) {
  if (rel === 'index.md' || rel === 'log.md') continue
  for (const claim of extractClaimBullets(meta.text)) {
    const key = claim.toLowerCase()
    if (!claimBuckets.has(key)) claimBuckets.set(key, { claim, pages: new Set() })
    claimBuckets.get(key).pages.add(rel)
  }
}
const duplicateClaims = [...claimBuckets.values()]
  .filter((v) => v.pages.size >= 2)
  .map((v) => ({
    claim: v.claim.slice(0, 160),
    pages: [...v.pages].sort(),
  }))
  .sort((a, b) => a.claim.localeCompare(b.claim))
  .slice(0, 50) // cap noise

/**
 * v2: page updated: lags a recent wiki/log mention of that page.
 * Count only wiki-links that resolve to the page, or explicit path mentions —
 * not bare substrings (e.g. ThroneOverview ≠ overview; casual product names ≠ page edit).
 */
const staleVsLogActivity = []
for (const [rel, meta] of pageMeta) {
  if (EXEMPT_UPDATED.has(rel)) continue
  const updated = meta.fm.updated
  if (!updated || !/^\d{4}-\d{2}-\d{2}$/.test(updated)) continue

  const pathNeedles = [rel, `wiki/${rel}`].map((s) => s.toLowerCase())

  let latestMention = null
  let mentionTitle = null
  for (const ent of logEntries) {
    const hay = `${ent.title}\n${ent.body}`
    const low = hay.toLowerCase()
    let hit = pathNeedles.some((n) => n.length >= 3 && low.includes(n))
    if (!hit) {
      const wikiLink = /\[\[([^\]]+)\]\]/g
      let m
      while ((m = wikiLink.exec(hay))) {
        const resolved = resolveWikiLink('log.md', m[1])
        if (resolved === rel) {
          hit = true
          break
        }
      }
    }
    if (!hit) continue
    if (!latestMention || ent.date > latestMention) {
      latestMention = ent.date
      mentionTitle = ent.title
    }
  }
  if (!latestMention) continue
  const lag = daysBetween(updated, latestMention)
  if (lag != null && lag > logLagDays) {
    staleVsLogActivity.push({
      page: rel,
      updated,
      log_mention_date: latestMention,
      log_entry: mentionTitle,
      lag_days: lag,
      reason: `updated_lags_log_mention (>${logLagDays}d)`,
    })
  }
}
staleVsLogActivity.sort((a, b) => a.page.localeCompare(b.page))

const warnings = {
  missing_from_index: missingIndex.length,
  orphans: orphans.length,
  stale_or_missing_updated: staleUpdated.length,
  duplicate_titles: duplicateTitles.length,
  duplicate_venture_ids: duplicateVentureIds.length,
  venture_path_mismatch: venturePathMismatch.length,
  orphan_venture_satellites: orphanVentureSatellites.length,
  duplicate_topics_light: duplicateTopics.length,
  conflicting_venture_status: conflictingVentureStatus.length,
  duplicate_claims: duplicateClaims.length,
  stale_vs_log_activity: staleVsLogActivity.length,
}

const warningCount = Object.values(warnings).reduce((a, b) => a + b, 0)

const report = {
  heuristic: 'v2',
  note: 'Deterministic structural + light heuristics (v2). Not an LLM contradiction / claim judge.',
  wiki_pages: pages.size,
  stale_days_threshold: staleDays,
  log_lag_days_threshold: logLagDays,
  stale_anchor_date: staleAnchor,
  broken_links: broken.length,
  warnings,
  broken,
  missing_from_index_list: missingIndex.sort(),
  orphan_list: orphans.sort(),
  stale_or_missing_updated: staleUpdated.sort((a, b) => a.page.localeCompare(b.page)),
  duplicate_titles: duplicateTitles,
  duplicate_venture_ids: duplicateVentureIds,
  venture_path_mismatch: venturePathMismatch.sort((a, b) => a.page.localeCompare(b.page)),
  orphan_venture_satellites: orphanVentureSatellites.sort((a, b) =>
    a.page.localeCompare(b.page),
  ),
  duplicate_topics_light: duplicateTopics,
  conflicting_venture_status: conflictingVentureStatus,
  duplicate_claims: duplicateClaims,
  stale_vs_log_activity: staleVsLogActivity,
}

console.log(JSON.stringify(report, null, 2))

const warnSummary =
  `index=${missingIndex.length} orphans=${orphans.length} stale=${staleUpdated.length}` +
  ` dup_titles=${duplicateTitles.length} dup_venture_id=${duplicateVentureIds.length}` +
  ` path_mismatch=${venturePathMismatch.length} orphan_satellites=${orphanVentureSatellites.length}` +
  ` dup_topics=${duplicateTopics.length}` +
  ` conflict_status=${conflictingVentureStatus.length} dup_claims=${duplicateClaims.length}` +
  ` stale_log=${staleVsLogActivity.length}`

const hasErrors = broken.length > 0
const hasWarnings = warningCount > 0
if (hasErrors || (strict && hasWarnings)) {
  console.error(
    `\nlint failed: ${broken.length} broken (errors)` +
      (hasWarnings ? `; warnings: ${warnSummary}` : '') +
      (strict ? ' (--strict)' : ''),
  )
  process.exit(1)
}

if (hasWarnings) {
  console.error(
    `\nlint ok with warnings (heuristic v2): ${warnSummary} (use --strict to fail; --stale-days N / --log-lag-days N to tune)`,
  )
} else {
  console.error(`\nlint ok: ${pages.size} pages, no broken links, no heuristic warnings`)
}
process.exit(0)
