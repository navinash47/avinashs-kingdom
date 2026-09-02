#!/usr/bin/env node
/**
 * Full auto wiki pipeline — Phase 2 W3.
 *
 * Batch (default) or watch: raw/inbox → draft source under wiki/drafts/ +
 * index/log *proposals*. Explicit --promote moves draft → published sources
 * after heuristic lint (+ optional judge). Idempotent via content hash state.
 *
 * Never edits filed raw. Never silently publishes.
 *
 * Usage:
 *   npm run brain:auto-wiki
 *   npm run brain:auto-wiki -- --file brain/raw/inbox/foo.md
 *   npm run brain:auto-wiki -- --watch --interval 30
 *   npm run brain:auto-wiki -- --promote <slug>
 *   npm run brain:auto-wiki -- --promote <slug> --judge
 *   npm run brain:auto-wiki -- --status
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const brainRoot = path.join(__dirname, '..')
const repoRoot = path.join(brainRoot, '..')
const inbox = path.join(brainRoot, 'raw', 'inbox')
const draftsDir = path.join(brainRoot, 'wiki', 'drafts', 'sources')
const sourcesDir = path.join(brainRoot, 'wiki', 'sources')
const indexPath = path.join(brainRoot, 'wiki', 'index.md')
const logPath = path.join(brainRoot, 'wiki', 'log.md')
const reportsDir = path.join(__dirname, 'reports')
const statePath = path.join(reportsDir, 'auto-wiki-state.json')
const latestPath = path.join(reportsDir, 'auto-wiki-latest.json')

const args = process.argv.slice(2)
function flag(name) {
  return args.includes(name)
}
function opt(name) {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : null
}
function optInt(name, fallback) {
  const v = Number(opt(name))
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : fallback
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

function ensureDir(d) {
  fs.mkdirSync(d, { recursive: true })
}

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex')
}

function loadState() {
  if (!fs.existsSync(statePath)) return { version: 1, by_hash: {}, by_slug: {} }
  return JSON.parse(fs.readFileSync(statePath, 'utf8'))
}

function saveState(state) {
  ensureDir(reportsDir)
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2) + '\n')
}

function writeLatest(payload) {
  ensureDir(reportsDir)
  fs.writeFileSync(latestPath, JSON.stringify(payload, null, 2) + '\n')
}

function extractFromRaw(rawText, fallbackTitle) {
  const text = String(rawText || '').replace(/^\uFEFF/, '')
  let title = null
  const h1 = text.match(/^#\s+(.+)$/m)
  if (h1) title = h1[1].trim().replace(/\s+/g, ' ')
  else {
    for (const line of text.split(/\r?\n/)) {
      const t = line.trim()
      if (!t || t.startsWith('---') || t.startsWith('```')) continue
      if (!/^[-*+]/.test(t) && t.length >= 8 && t.length <= 120 && !/^https?:/i.test(t)) {
        title = t.replace(/^["']|["']$/g, '')
        break
      }
    }
  }
  const bullets = []
  let inFence = false
  let pastFrontmatter = !text.startsWith('---')
  let fmDashes = 0
  for (const line of text.split(/\r?\n/)) {
    if (!pastFrontmatter) {
      if (line.trim() === '---') {
        fmDashes++
        if (fmDashes >= 2) pastFrontmatter = true
      }
      continue
    }
    if (line.trim().startsWith('```')) {
      inFence = !inFence
      continue
    }
    if (inFence) continue
    const m = line.match(/^\s*[-*+]\s+(.+)$/)
    if (m) {
      const b = m[1].trim().replace(/\s+/g, ' ')
      if (b.length >= 12 && b.length <= 240) bullets.push(b)
      if (bullets.length >= 8) break
    }
  }
  if (!bullets.length) {
    const body = text.replace(/^---[\s\S]*?---\r?\n?/, '').replace(/^#.+\n+/, '')
    const paras = body
      .split(/\n\s*\n/)
      .map((p) => p.replace(/\s+/g, ' ').trim())
      .filter((p) => p.length >= 40 && !p.startsWith('```'))
    for (const p of paras.slice(0, 3)) {
      bullets.push(p.length > 200 ? `${p.slice(0, 197)}…` : p)
    }
  }
  return { title: title || fallbackTitle || null, bullets }
}

function listInboxFiles() {
  if (!fs.existsSync(inbox)) return []
  return fs
    .readdirSync(inbox)
    .filter((n) => !n.startsWith('.') && n !== 'README.md')
    .map((n) => path.join(inbox, n))
    .filter((p) => fs.statSync(p).isFile() && /\.(md|txt|markdown)$/i.test(p))
}

function draftBody({ slug, title, rawRel, hash, bullets }) {
  const summary =
    bullets.length > 0
      ? bullets.map((b) => `- ${b}`).join('\n')
      : '_TODO — expand before promote._'
  const claims =
    bullets.length > 0
      ? bullets
          .slice(0, 5)
          .map((b) => `- ${b}`)
          .join('\n')
      : '- '
  return `---
type: source
publish_status: draft
updated: ${today()}
raw_hash: ${hash}
tags: [auto-wiki, draft]
---

# ${title}

**Raw:** \`${rawRel}\`  
**Status:** draft — promote with \`npm run brain:auto-wiki -- --promote ${slug}\`

> Auto-compiled draft from inbox. Review before publish. Raw is immutable.

## Summary

${summary}

## Key claims

${claims}

## Limitations

- Auto-wiki draft — verify against raw; do not treat as published truth.

## Links

- [[index]]
`
}

function processFile(abs, state) {
  const base = path.basename(abs)
  const slug = slugify(opt('--slug') || base)
  const buf = fs.readFileSync(abs)
  const hash = sha256(buf)
  const rawRel = path.relative(brainRoot, abs).split(path.sep).join('/')

  if (state.by_hash[hash]) {
    return {
      status: 'skipped_duplicate',
      slug: state.by_hash[hash].slug,
      hash,
      raw: rawRel,
      note: 'Same content hash already processed — idempotent skip',
    }
  }

  // If slug already published or drafted with different hash, suffix
  let finalSlug = slug
  const draftAbs = path.join(draftsDir, `${finalSlug}.md`)
  const pubAbs = path.join(sourcesDir, `${finalSlug}.md`)
  if (
    (fs.existsSync(draftAbs) || fs.existsSync(pubAbs)) &&
    state.by_slug[finalSlug]?.hash !== hash
  ) {
    finalSlug = `${slug}-${hash.slice(0, 8)}`
  }

  const text = buf.toString('utf8')
  const extracted = extractFromRaw(text, slugify(base).replace(/-/g, ' '))
  const title = extracted.title || finalSlug

  ensureDir(draftsDir)
  const outAbs = path.join(draftsDir, `${finalSlug}.md`)
  if (!fs.existsSync(outAbs)) {
    fs.writeFileSync(
      outAbs,
      draftBody({
        slug: finalSlug,
        title,
        rawRel,
        hash,
        bullets: extracted.bullets,
      }),
    )
  }

  const oneLine =
    extracted.bullets[0]?.slice(0, 100) || '_auto-wiki draft — review before promote_'
  const indexRow = `| [${title}](sources/${finalSlug}.md) | ${oneLine} |`
  const logEntry = `## [${today()}] ingest | ${title} (auto-wiki draft → promote to publish)`

  const proposal = {
    slug: finalSlug,
    draft: `wiki/drafts/sources/${finalSlug}.md`,
    published_target: `wiki/sources/${finalSlug}.md`,
    index_row_proposal: indexRow,
    log_line_proposal: logEntry,
    promote: `npm run brain:auto-wiki -- --promote ${finalSlug}`,
  }

  state.by_hash[hash] = {
    slug: finalSlug,
    raw: rawRel,
    draft: proposal.draft,
    at: new Date().toISOString(),
  }
  state.by_slug[finalSlug] = {
    hash,
    raw: rawRel,
    draft: proposal.draft,
    published: false,
  }

  return {
    status: 'drafted',
    ...proposal,
    hash,
    raw: rawRel,
    title,
    bullets: extracted.bullets.length,
  }
}

function runLint() {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'lint.mjs')], {
    cwd: repoRoot,
    encoding: 'utf8',
  })
  return {
    ok: r.status === 0,
    status: r.status,
    stdout: (r.stdout || '').slice(-2000),
    stderr: (r.stderr || '').slice(-1000),
  }
}

function runJudgeOptional() {
  const r = spawnSync(
    process.execPath,
    [path.join(__dirname, 'judge.mjs'), '--offline', '--max-pairs', '10'],
    { cwd: repoRoot, encoding: 'utf8' },
  )
  return {
    ok: r.status === 0,
    status: r.status,
    stdout: (r.stdout || '').slice(-1500),
  }
}

function ensureSourcesSection() {
  let index = fs.readFileSync(indexPath, 'utf8')
  if (/## Sources\b/.test(index)) return
  index =
    index.trimEnd() +
    `\n\n## Sources\n\n| Page | Summary |\n|------|---------|\n`
  fs.writeFileSync(indexPath, index + '\n')
}

function appendIndexRow(row) {
  ensureSourcesSection()
  let index = fs.readFileSync(indexPath, 'utf8')
  const linkMatch = row.match(/\((sources\/[^)]+)\)/)
  if (linkMatch && index.includes(linkMatch[1])) return false
  const re = /(## Sources\n\n\|[^\n]+\n\|[-| ]+\n)/
  if (re.test(index)) {
    index = index.replace(re, `$1${row}\n`)
  } else {
    index = index.trimEnd() + `\n${row}\n`
  }
  fs.writeFileSync(indexPath, index)
  return true
}

function appendLog(line, detail) {
  const block = `${line}\n\n${detail}\n\n`
  let log = fs.readFileSync(logPath, 'utf8')
  if (log.includes(line)) return false
  // Insert before the first dated entry `## [YYYY-MM-DD]`
  const m = log.match(/^## \[\d{4}-\d{2}-\d{2}\]/m)
  if (m && m.index != null) {
    log = log.slice(0, m.index) + block + log.slice(m.index)
    fs.writeFileSync(logPath, log)
    return true
  }
  fs.appendFileSync(logPath, '\n' + block)
  return true
}

function promote(slug, withJudge) {
  const draftAbs = path.join(draftsDir, `${slug}.md`)
  if (!fs.existsSync(draftAbs)) {
    console.error(`No draft at wiki/drafts/sources/${slug}.md`)
    process.exit(1)
  }

  const lint = runLint()
  if (!lint.ok) {
    writeLatest({
      at: new Date().toISOString(),
      op: 'promote',
      slug,
      ok: false,
      reason: 'lint_failed',
      lint,
    })
    console.error('Promote blocked: brain:lint failed')
    console.error(lint.stderr || lint.stdout)
    process.exit(1)
  }

  let judge = null
  if (withJudge) {
    judge = runJudgeOptional()
    if (!judge.ok) {
      console.error('Promote blocked: brain:judge failed')
      process.exit(1)
    }
  }

  let body = fs.readFileSync(draftAbs, 'utf8')
  body = body
    .replace(/publish_status:\s*draft/, 'publish_status: published')
    .replace(/tags:\s*\[auto-wiki,\s*draft\]/, 'tags: [auto-wiki]')
    .replace(/\*\*Status:\*\* draft[^\n]*/, '**Status:** published (auto-wiki promote)')
    .replace(
      /> Auto-compiled draft from inbox\.[^\n]*/,
      '> Promoted from auto-wiki draft after lint' + (withJudge ? ' + judge' : '') + '.',
    )

  ensureDir(sourcesDir)
  const pubAbs = path.join(sourcesDir, `${slug}.md`)
  if (fs.existsSync(pubAbs)) {
    console.error(`Published source already exists: wiki/sources/${slug}.md — abort`)
    process.exit(1)
  }
  fs.writeFileSync(pubAbs, body)
  fs.unlinkSync(draftAbs)

  // Title from H1
  const title = (body.match(/^#\s+(.+)$/m) || [, slug])[1].trim()
  const oneLine = '_published via auto-wiki promote_'
  const indexRow = `| [${title}](sources/${slug}.md) | ${oneLine} |`
  const logLine = `## [${today()}] ingest | ${title}`
  appendIndexRow(indexRow)
  appendLog(
    logLine,
    `Auto-wiki promote of draft \`${slug}\` → \`wiki/sources/${slug}.md\` after lint` +
      (withJudge ? ' + judge' : '') +
      '.',
  )

  const state = loadState()
  if (state.by_slug[slug]) {
    state.by_slug[slug].published = true
    state.by_slug[slug].published_at = new Date().toISOString()
    state.by_slug[slug].draft = null
    state.by_slug[slug].source = `wiki/sources/${slug}.md`
  }
  saveState(state)

  const result = {
    ok: true,
    op: 'promote',
    slug,
    source: `wiki/sources/${slug}.md`,
    index_row: indexRow,
    log_line: logLine,
    lint_ok: true,
    judge_ran: Boolean(withJudge),
    at: new Date().toISOString(),
  }
  writeLatest(result)
  console.log(JSON.stringify(result, null, 2))
}

async function batchOnce(files) {
  const state = loadState()
  const results = []
  for (const f of files) {
    results.push(processFile(f, state))
  }
  saveState(state)

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const reportPath = path.join(reportsDir, `auto-wiki-${stamp}.json`)
  const payload = {
    at: new Date().toISOString(),
    op: 'batch',
    ok: true,
    processed: results.length,
    drafted: results.filter((r) => r.status === 'drafted').length,
    skipped_duplicate: results.filter((r) => r.status === 'skipped_duplicate').length,
    results,
    note:
      'Drafts only. Index/log lines are proposals until --promote. Raw files untouched.',
  }
  ensureDir(reportsDir)
  fs.writeFileSync(reportPath, JSON.stringify(payload, null, 2) + '\n')
  writeLatest(payload)
  console.log(JSON.stringify({ ...payload, report: path.relative(repoRoot, reportPath) }, null, 2))
  return payload
}

// --- main ---
if (flag('--status')) {
  const latest = fs.existsSync(latestPath)
    ? JSON.parse(fs.readFileSync(latestPath, 'utf8'))
    : null
  const state = loadState()
  console.log(
    JSON.stringify(
      {
        latest,
        drafts: fs.existsSync(draftsDir)
          ? fs.readdirSync(draftsDir).filter((n) => n.endsWith('.md'))
          : [],
        hashes_tracked: Object.keys(state.by_hash || {}).length,
      },
      null,
      2,
    ),
  )
  process.exit(0)
}

const promoteSlug = opt('--promote')
if (promoteSlug) {
  promote(promoteSlug, flag('--judge'))
  process.exit(0)
}

const fileArg = opt('--file')
let files = []
if (fileArg) {
  const abs = path.isAbsolute(fileArg) ? fileArg : path.resolve(process.cwd(), fileArg)
  if (!fs.existsSync(abs)) {
    console.error('File not found:', abs)
    process.exit(1)
  }
  // If outside inbox, copy like ingest (immutable file into inbox)
  if (!abs.startsWith(inbox + path.sep)) {
    ensureDir(inbox)
    const dest = path.join(inbox, path.basename(abs))
    if (!fs.existsSync(dest)) fs.copyFileSync(abs, dest)
    files = [dest]
  } else {
    files = [abs]
  }
} else {
  files = listInboxFiles()
}

if (!files.length && !flag('--watch')) {
  console.error('No inbox markdown to process. Drop a file in brain/raw/inbox/ then re-run.')
  writeLatest({
    at: new Date().toISOString(),
    op: 'batch',
    ok: true,
    processed: 0,
    note: 'empty inbox',
  })
  process.exit(0)
}

if (flag('--watch')) {
  const intervalSec = optInt('--interval', 30)
  console.error(`Watching ${inbox} every ${intervalSec}s (Ctrl+C to stop)`)
  const tick = async () => {
    const list = fileArg ? files : listInboxFiles()
    if (list.length) await batchOnce(list)
  }
  await tick()
  setInterval(tick, intervalSec * 1000)
} else {
  await batchOnce(files)
}
