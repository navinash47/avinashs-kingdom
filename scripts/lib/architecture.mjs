import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { resolveRepoPath } from './registry.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MMDC = path.join(__dirname, '../../node_modules/.bin/mmdc')

function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!m) return {}
  const fm = {}
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.+)$/)
    if (kv) fm[kv[1]] = kv[2].trim()
  }
  return fm
}

function extractMermaidBlocks(content) {
  const blocks = []
  const re = /```mermaid\n([\s\S]*?)```/g
  let m
  while ((m = re.exec(content)) !== null) {
    blocks.push(m[1].trim())
  }
  return blocks
}

function renderMermaid(mermaidSrc, outSvgPath) {
  const tmpDir = path.dirname(outSvgPath)
  fs.mkdirSync(tmpDir, { recursive: true })
  const mmdPath = outSvgPath.replace(/\.svg$/, '.mmd')
  fs.writeFileSync(mmdPath, mermaidSrc)
  const mmdc = fs.existsSync(MMDC) ? MMDC : 'mmdc'
  try {
    execFileSync(mmdc, ['-i', mmdPath, '-o', outSvgPath, '-b', 'transparent'], {
      stdio: 'ignore',
    })
    if (fs.existsSync(outSvgPath)) {
      return fs.readFileSync(outSvgPath, 'utf8')
    }
  } catch {
    /* mmdc not installed */
  }
  return null
}

function parseSections(text, ventureId, svgDir, publicDataPrefix) {
  const body = text.replace(/^---[\s\S]*?---\r?\n?/, '')
  const sections = {}
  const parts = body.split(/^## /m).slice(1)
  let mermaidIdx = 0
  for (const part of parts) {
    const nl = part.indexOf('\n')
    if (nl === -1) continue
    const title = part.slice(0, nl).trim()
    const content = part.slice(nl + 1).trim()
    const key = title.toLowerCase()
    const mermaidBlocks = extractMermaidBlocks(content)
    const diagrams = []
    for (const block of mermaidBlocks) {
      const svgName = `${ventureId}-${mermaidIdx}.svg`
      const svgPath = path.join(svgDir, svgName)
      const svg = renderMermaid(block, svgPath)
      diagrams.push({
        source: block,
        svg_path: svg ? `${publicDataPrefix}/architecture/svg/${svgName}` : null,
        svg_inline: svg,
      })
      mermaidIdx++
    }
    const markdownWithoutMermaid = content.replace(/```mermaid[\s\S]*?```/g, '').trim()
    sections[key] = {
      title,
      content,
      markdown: markdownWithoutMermaid,
      diagrams,
      tables: parseMarkdownTables(markdownWithoutMermaid),
    }
  }
  return sections
}

function parseMarkdownTables(markdown) {
  const tables = []
  const lines = markdown.split('\n')
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (line.trim().startsWith('|') && lines[i + 1]?.includes('---')) {
      const headers = line
        .split('|')
        .map((c) => c.trim())
        .filter(Boolean)
      i += 2
      const rows = []
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const cells = lines[i]
          .split('|')
          .map((c) => c.trim())
          .filter(Boolean)
        rows.push(cells)
        i++
      }
      tables.push({ headers, rows })
      continue
    }
    i++
  }
  return tables
}

function parseVideoHint(summary) {
  const m = String(summary).match(/\s*Video:\s*(\S+)/i)
  if (!m) return { summary, video: null }
  return {
    summary: summary.replace(m[0], '').replace(/\s+[—–-]\s*$/, '').trim(),
    video: m[1].replace(/[.,;)]+$/, ''),
  }
}

function parseExperiments(text) {
  const items = []
  for (const line of text.split('\n')) {
    // - **2026-08-16:** summary  (colon may be inside or outside bold)
    let m = line.match(/^-\s+\*\*(\d{4}-\d{2}-\d{2}):?\*\*:?\s+(.+)$/)
    if (m) {
      const parsed = parseVideoHint(m[2].replace(/\*\*/g, '').trim())
      items.push({ date: m[1], summary: parsed.summary, source: 'wiki', video: parsed.video })
      continue
    }
    // - 2026-08-16: summary
    m = line.match(/^-\s+(\d{4}-\d{2}-\d{2}):\s+(.+)$/)
    if (m) {
      const parsed = parseVideoHint(m[2].trim())
      items.push({ date: m[1], summary: parsed.summary, source: 'wiki', video: parsed.video })
    }
  }
  return items
}

function gitLogExperiments(repoRoot, max = 15) {
  if (!repoRoot || !fs.existsSync(path.join(repoRoot, '.git'))) return []
  try {
    const out = execFileSync(
      'git',
      ['log', '--since=90.days', `--max-count=${max}`, '--pretty=format:%ad|%s', '--date=short'],
      { cwd: repoRoot, encoding: 'utf8', timeout: 15_000, stdio: ['ignore', 'pipe', 'ignore'] },
    )
    const items = []
    for (const line of out.split('\n')) {
      const pipe = line.indexOf('|')
      if (pipe < 0) continue
      const date = line.slice(0, pipe).trim()
      const summary = line.slice(pipe + 1).trim()
      if (!date || !summary) continue
      if (/^merge\b/i.test(summary)) continue
      items.push({ date, summary, source: 'git' })
    }
    return items
  } catch {
    return []
  }
}

function mergeExperimentItems(wikiItems, gitItems) {
  const seen = new Set()
  const out = []
  const keyOf = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 80)
  for (const item of [...wikiItems, ...gitItems]) {
    const k = `${item.date}|${keyOf(item.summary)}`
    if (seen.has(k)) continue
    // soft dedupe: skip git if wiki summary shares first 40 chars
    let dup = false
    for (const prev of out) {
      if (
        prev.date === item.date &&
        keyOf(prev.summary).slice(0, 40) === keyOf(item.summary).slice(0, 40)
      ) {
        dup = true
        break
      }
    }
    if (dup) continue
    seen.add(k)
    out.push(item)
  }
  out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  return out.slice(0, 40)
}

export function parseArchitectureMd(text, ventureId, svgDir) {
  const frontmatter = parseFrontmatter(text)
  const sections = parseSections(text, ventureId, svgDir, '/data')
  return {
    venture_id: frontmatter.venture_id ?? ventureId ?? null,
    updated: frontmatter.updated ?? null,
    type: frontmatter.type ?? 'architecture',
    sections,
    section_titles: Object.values(sections).map((s) => s.title),
  }
}

export function syncArchitectureBundles(registry, kingdomRoot, dataDir) {
  const outDir = path.join(dataDir, 'architecture')
  const svgDir = path.join(outDir, 'svg')
  fs.mkdirSync(outDir, { recursive: true })
  fs.mkdirSync(svgDir, { recursive: true })
  let count = 0

  for (const entry of registry.ventures ?? []) {
    const archRel = entry.wiki?.architecture
    if (!archRel) continue
    const archPath = path.join(kingdomRoot, archRel)
    if (!fs.existsSync(archPath)) continue
    const text = fs.readFileSync(archPath, 'utf8')
    const parsed = parseArchitectureMd(text, entry.id, svgDir)
    parsed.source_path = archRel
    fs.writeFileSync(
      path.join(outDir, `${entry.id}.json`),
      JSON.stringify(parsed, null, 2) + '\n',
    )
    count++
  }
  console.log('Wrote architecture bundles for', count, 'ventures')
}

export function syncExperimentsBundles(registry, kingdomRoot, dataDir) {
  const outDir = path.join(dataDir, 'experiments')
  fs.mkdirSync(outDir, { recursive: true })
  let count = 0

  for (const entry of registry.ventures ?? []) {
    const expRel = entry.wiki?.experiments
    if (!expRel) continue
    const expPath = path.join(kingdomRoot, expRel)
    if (!fs.existsSync(expPath)) continue
    const text = fs.readFileSync(expPath, 'utf8')
    const fm = parseFrontmatter(text)
    const wikiItems = parseExperiments(text)
    const repoRoot = resolveRepoPath(entry)
    const gitItems = gitLogExperiments(repoRoot)
    const items = mergeExperimentItems(wikiItems, gitItems)
    const bundle = {
      venture_id: entry.id,
      updated: fm.updated ?? new Date().toISOString().slice(0, 10),
      items,
      source_path: expRel,
    }
    fs.writeFileSync(
      path.join(outDir, `${entry.id}.json`),
      JSON.stringify(bundle, null, 2) + '\n',
    )
    count++
  }
  console.log('Wrote experiments bundles for', count, 'ventures')
}
