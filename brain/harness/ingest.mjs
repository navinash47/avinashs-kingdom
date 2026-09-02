#!/usr/bin/env node
/**
 * Semi-auto ingest — mechanical happy path for brain/AGENTS.md.
 *
 * What this CLI does (deterministic):
 *   - list raw/inbox + raw/research
 *   - file a copy under raw/inbox when --file is outside brain/raw
 *   - scaffold wiki/sources/<slug>.md (default on --file; use --no-scaffold to skip)
 *   - best-effort extract title + summary bullets from the raw text into the stub
 *   - print an exact index/log checklist with copy-pasteable lines
 *   - remind: review/complete with kingdom-wiki (human still reviews)
 *
 * What stays manual / agent (kingdom-wiki ingest):
 *   - verifying extracted bullets, writing claims/limitations, updating related pages
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
 * Best-effort title + summary bullets from raw text (markdown or plain).
 * Human must still review via kingdom-wiki — this is a stub helper only.
 * @returns {{ title: string | null, bullets: string[], method: string }}
 */
function extractFromRaw(rawText, fallbackTitle) {
  const text = String(rawText || '').replace(/^\uFEFF/, '')
  // Prefer first markdown H1; else first non-empty line that looks like a title
  let title = null
  const h1 = text.match(/^#\s+(.+)$/m)
  if (h1) {
    title = h1[1].trim().replace(/\s+/g, ' ')
  } else {
    for (const line of text.split(/\r?\n/)) {
      const t = line.trim()
      if (!t || t.startsWith('---') || t.startsWith('```')) continue
      if (t.startsWith('# ')) {
        title = t.slice(2).trim()
        break
      }
      // plain title-ish line (not a bullet, not too long)
      if (!/^[-*+]/.test(t) && t.length >= 8 && t.length <= 120 && !/^https?:/i.test(t)) {
        title = t.replace(/^["']|["']$/g, '')
        break
      }
    }
  }

  const bullets = []
  // Collect markdown bullets near the top (skip frontmatter / code fences lightly)
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
      continue
    }
    // After we have some bullets, stop at next heading
    if (bullets.length && /^#{1,3}\s+/.test(line)) break
  }

  // Fallback: first 1–3 non-empty prose paragraphs → truncated bullets
  if (!bullets.length) {
    const body = text
      .replace(/^---[\s\S]*?---\r?\n?/, '')
      .replace(/^#.+\n+/, '')
    const paras = body
      .split(/\n\s*\n/)
      .map((p) => p.replace(/\s+/g, ' ').trim())
      .filter((p) => p.length >= 40 && !p.startsWith('```'))
    for (const p of paras.slice(0, 3)) {
      bullets.push(p.length > 200 ? `${p.slice(0, 197)}…` : p)
    }
  }

  return {
    title: title || fallbackTitle || null,
    bullets,
    method: bullets.length
      ? title
        ? 'h1_or_line+bullets_or_paras'
        : 'bullets_or_paras'
      : 'title_only_or_empty',
  }
}

/**
 * Exact mechanical checklist — paths and paste lines, not vague advice.
 */
function printChecklist({ slug, rawRel, sourceRel, sourceCreated, title, extracted }) {
  const date = today()
  const displayTitle = title || titleFromSlug(slug)
  const oneLine =
    extracted?.bullets?.[0]?.slice(0, 100) || '_one-line summary — review with kingdom-wiki_'
  const indexRow = `| [${displayTitle}](sources/${slug}.md) | source | ${oneLine} |`
  const logEntry = `## [${date}] ingest | ${displayTitle}`

  console.log(`# Ingest checklist (mechanical) — ${slug}

## Done by this CLI
1. Raw filed (immutable): \`${rawRel}\`
2. Source stub: \`${sourceRel}\`${sourceCreated ? ' (created; best-effort title/summary extracted)' : ' (already existed — not overwritten)'}
${extracted?.bullets?.length ? `3. Extracted ${extracted.bullets.length} summary bullet(s) into the stub (best-effort — may be noisy)` : '3. No summary bullets extracted (stub has TODOs)'}

## Agent / human next (kingdom-wiki ingest — LLM compile)
**Review / complete with kingdom-wiki** — verify title + bullets, fill claims/limitations, link related pages. Human still reviews.
4. Fill \`wiki/sources/${slug}.md\` — Summary, Key claims, Limitations, [[links]]
5. Update related \`wiki/ventures/\` · \`concepts/\` · \`entities/\` (create if needed)
6. System/IO → \`wiki/architecture/\`; try logs → \`wiki/experiments/\`

## Exact catalog + log edits
7. Add a row to \`wiki/index.md\` (Sources section), e.g.:
   ${indexRow}
8. Append to \`wiki/log.md\`:
   ${logEntry}
   <one sentence: what was ingested and which pages updated>

## Hygiene
9. If panel-facing STATUS/phases/expenses moved: \`npm run sync\`
10. \`npm run brain:lint\`

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
        note: '--file scaffolds wiki/sources/<slug>.md by default (best-effort title/summary); --no-scaffold skips stub; review/complete with kingdom-wiki',
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

const rawText = fs.readFileSync(abs, 'utf8')
const extracted = extractFromRaw(rawText, titleFromSlug(slug))
const displayTitle = extracted.title || titleFromSlug(slug)

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
    const summaryBlock =
      extracted.bullets.length > 0
        ? extracted.bullets.map((b) => `- ${b}`).join('\n')
        : '_TODO — fill via kingdom-wiki ingest (LLM compile)._'
    const claimsBlock =
      extracted.bullets.length > 0
        ? extracted.bullets
            .slice(0, 5)
            .map((b) => `- ${b}`)
            .join('\n')
        : '- '
    const body = `---
type: source
updated: ${today()}
tags: []
---

# ${displayTitle}

**Raw:** \`${rawRel}\`

> Best-effort extract from raw (\`${extracted.method}\`). **Review / complete with kingdom-wiki** — human still reviews.

## Summary

${summaryBlock}

## Key claims

${claimsBlock}

## Limitations

- Extraction is mechanical (first bullets / paragraphs) — verify against raw before trusting claims.

## Links

- [[index]]
`
    fs.writeFileSync(sourceAbs, body)
    sourceCreated = true
    console.error(`Scaffolded ${sourceRel} (title + ${extracted.bullets.length} bullet(s) extracted)`)
  }
} else {
  console.error('Skipped source scaffold (--no-scaffold)')
}

printChecklist({
  slug,
  rawRel,
  sourceRel,
  sourceCreated: doScaffold ? sourceCreated : false,
  title: displayTitle,
  extracted,
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
      extracted: {
        title: displayTitle,
        bullet_count: extracted.bullets.length,
        bullets: extracted.bullets,
        method: extracted.method,
      },
      review_note: 'review/complete with kingdom-wiki — human still reviews',
      index_path: path.relative(brainRoot, indexPath),
      log_path: path.relative(brainRoot, logPath),
      next: [
        `Review ${sourceRel} title/summary with kingdom-wiki`,
        'Update related wiki pages',
        `Add index row for sources/${slug}.md`,
        `Append log: ## [${today()}] ingest | ${displayTitle}`,
        'npm run brain:lint',
      ],
    },
    null,
    2,
  ),
)

process.exit(0)
