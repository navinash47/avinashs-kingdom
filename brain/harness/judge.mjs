#!/usr/bin/env node
/**
 * LLM contradiction judge for brain/wiki — Phase 2 W2.
 *
 * Additive to heuristic brain:lint (v2). Default is dry-run: writes a structured
 * report under brain/harness/reports/, never silently rewrites wiki.
 *
 * Modes:
 *   offline (default when LLM unreachable) — heuristic candidate pairs + notes
 *   llm — OmniRoute OpenAI-compatible chat at OMNIROUTE_BASE_URL (default :20128/v1)
 *
 * Usage:
 *   npm run brain:judge
 *   npm run brain:judge -- --fixture
 *   npm run brain:judge -- --max-pairs 12
 *   npm run brain:judge -- --apply          # gated: write proposals only
 *   npm run brain:judge -- --require-llm    # exit 2 if LLM unavailable
 *
 * Exit 0 on successful dry-run / report write (including offline).
 * Exit 2 if --require-llm and LLM call fails.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const brainRoot = path.join(__dirname, '..')
const repoRoot = path.join(brainRoot, '..')
const wikiRoot = path.join(brainRoot, 'wiki')
const reportsDir = path.join(__dirname, 'reports')
const proposalsDir = path.join(reportsDir, 'proposals')
const fixturesDir = path.join(__dirname, 'fixtures', 'judge-conflict')

const argv = process.argv.slice(2)
const apply = argv.includes('--apply')
const requireLlm = argv.includes('--require-llm')
const useFixture = argv.includes('--fixture')
const forceOffline = argv.includes('--offline')

function optInt(name, fallback) {
  const i = argv.indexOf(name)
  if (i < 0) return fallback
  const n = Number(argv[i + 1])
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback
}

function optStr(name, fallback) {
  const i = argv.indexOf(name)
  if (i < 0) return fallback
  return argv[i + 1] || fallback
}

const maxPairs = optInt('--max-pairs', 20)
const maxPages = optInt('--max-pages', 80)
const omniBase = (
  process.env.OMNIROUTE_BASE_URL ||
  process.env.OPENAI_BASE_URL ||
  'http://127.0.0.1:20128/v1'
).replace(/\/$/, '')
const omniKey =
  process.env.OMNIROUTE_API_KEY ||
  process.env.OPENAI_API_KEY ||
  'omniroute'

const OPPOSITES = [
  ['active', 'parked'],
  ['active', 'paused'],
  ['shipping', 'parked'],
  ['in progress', 'complete'],
  ['in progress', 'done'],
  ['blocked', 'shipping'],
  ['never', 'always'],
  ['must not', 'must'],
  ['do not', 'always'],
  ['immutable', 'editable'],
  ['read-only', 'write'],
  ['draft', 'published'],
  ['heuristic', 'llm judge'],
]

function ensureDir(d) {
  fs.mkdirSync(d, { recursive: true })
}

function walkMd(root) {
  /** @type {Map<string, string>} */
  const pages = new Map()
  function walk(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ent.name.startsWith('.')) continue
      const abs = path.join(dir, ent.name)
      if (ent.isDirectory()) walk(abs)
      else if (ent.name.endsWith('.md')) {
        const rel = path.relative(root, abs).split(path.sep).join('/')
        pages.set(rel, abs)
      }
    }
  }
  walk(root)
  return pages
}

function bodyText(text) {
  if (text.startsWith('---')) {
    const end = text.indexOf('\n---', 3)
    if (end >= 0) return text.slice(end + 4)
  }
  return text
}

function stripMdLite(s) {
  return s
    .replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[`*_~>#]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Claim-like bullets + short “Status:” / bold claim lines.
 * @returns {{ text: string, kind: string }[]}
 */
function extractClaims(text) {
  const body = bodyText(text)
  const out = []
  for (const line of body.split(/\r?\n/)) {
    const bullet = line.match(/^\s*[-*]\s+(.+)$/)
    if (bullet) {
      const raw = stripMdLite(bullet[1])
      if (raw.length < 40) continue
      if (/^_?todo|_?tbd|fill via|one-line summary/i.test(raw)) continue
      if (/^(sources|concepts|ventures|entities|ops|architecture|experiments|wiki)\//i.test(raw)) {
        continue
      }
      out.push({ text: raw, kind: 'bullet' })
      continue
    }
    const status = line.match(/^\*\*Status:\*\*\s*(.+)$/i)
    if (status) {
      const raw = stripMdLite(status[1])
      if (raw.length >= 8) out.push({ text: `Status: ${raw}`, kind: 'status' })
    }
  }
  return out
}

/**
 * @param {{ page: string, text: string, kind: string }[]} claims
 */
function candidatePairs(claims) {
  /** @type {{ a: typeof claims[0], b: typeof claims[0], reason: string, severity: string }[]} */
  const pairs = []
  const n = claims.length
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = claims[i]
      const b = claims[j]
      if (a.page === b.page && a.text === b.text) continue
      const la = a.text.toLowerCase()
      const lb = b.text.toLowerCase()
      for (const [x, y] of OPPOSITES) {
        const hit =
          (la.includes(x) && lb.includes(y)) || (la.includes(y) && lb.includes(x))
        if (hit) {
          pairs.push({
            a,
            b,
            reason: `opposite tokens: "${x}" vs "${y}"`,
            severity: 'warn',
          })
          break
        }
      }
      // Same venture basename conflict across pages
      const va = a.page.match(/ventures\/([^/]+)/)?.[1]
      const vb = b.page.match(/ventures\/([^/]+)/)?.[1]
      if (va && va === vb && a.kind === 'status' && b.kind === 'status' && la !== lb) {
        pairs.push({
          a,
          b,
          reason: 'conflicting Status lines on same venture id pages',
          severity: 'warn',
        })
      }
    }
  }
  // Prefer cross-page pairs, then cap
  pairs.sort((p, q) => {
    const cross = (x) => (x.a.page === x.b.page ? 1 : 0)
    return cross(p) - cross(q)
  })
  return pairs.slice(0, maxPairs)
}

async function callLlm(prompt) {
  const url = `${omniBase}/chat/completions`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${omniKey}`,
    },
    body: JSON.stringify({
      model: process.env.KINGDOM_JUDGE_MODEL || 'anthropic/claude-sonnet-4-5',
      temperature: 0,
      messages: [
        {
          role: 'system',
          content:
            'You are a careful wiki contradiction judge. Reply ONLY with JSON array of objects: ' +
            '{id,contradiction:boolean,severity,suggested_resolution,notes}. Never invent secrets. ' +
            'Do not rewrite wiki pages; only advise.',
        },
        { role: 'user', content: prompt },
      ],
    }),
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(`LLM HTTP ${res.status}: ${t.slice(0, 200)}`)
  }
  const data = await res.json()
  const content = data.choices?.[0]?.message?.content || ''
  const jsonMatch = content.match(/\[[\s\S]*\]/)
  if (!jsonMatch) throw new Error('LLM response missing JSON array')
  return JSON.parse(jsonMatch[0])
}

function offlineJudge(pairs) {
  return pairs.map((p, idx) => ({
    id: `pair-${idx + 1}`,
    contradiction: true,
    severity: p.severity,
    claim_a: { page: p.a.page, text: p.a.text },
    claim_b: { page: p.b.page, text: p.b.text },
    heuristic_reason: p.reason,
    suggested_resolution:
      'Human review: confirm whether both claims are still true; update the stale page or add a dated supersession note. Do not auto-edit.',
    notes: 'offline heuristic — not an LLM verdict',
  }))
}

function buildLlmPrompt(pairs) {
  const payload = pairs.map((p, idx) => ({
    id: `pair-${idx + 1}`,
    claim_a: { page: p.a.page, text: p.a.text },
    claim_b: { page: p.b.page, text: p.b.text },
    heuristic_reason: p.reason,
  }))
  return (
    'Judge whether each claim pair is a real contradiction in a personal knowledge wiki.\n' +
    'Return JSON array only.\n\n' +
    JSON.stringify(payload, null, 2)
  )
}

function loadCorpus(root) {
  const pages = walkMd(root)
  /** @type {{ page: string, text: string, kind: string }[]} */
  const claims = []
  let pageCount = 0
  for (const [rel, abs] of pages) {
    if (pageCount >= maxPages) break
    pageCount++
    const text = fs.readFileSync(abs, 'utf8')
    for (const c of extractClaims(text)) {
      claims.push({ page: rel, text: c.text, kind: c.kind })
    }
  }
  return { pages: pageCount, claims, pairs: candidatePairs(claims) }
}

async function main() {
  ensureDir(reportsDir)

  const corpusRoot = useFixture ? fixturesDir : wikiRoot
  if (useFixture && !fs.existsSync(fixturesDir)) {
    console.error('Missing fixtures at', fixturesDir)
    process.exit(1)
  }

  const { pages, claims, pairs } = loadCorpus(corpusRoot)

  let mode = 'offline'
  /** @type {any[]} */
  let findings = []
  let llmError = null

  if (!forceOffline && !useFixture) {
    try {
      const judged = await callLlm(buildLlmPrompt(pairs))
      mode = 'llm'
      findings = pairs.map((p, idx) => {
        const id = `pair-${idx + 1}`
        const j = judged.find((x) => x.id === id) || {}
        return {
          id,
          contradiction: Boolean(j.contradiction ?? true),
          severity: j.severity || p.severity,
          claim_a: { page: p.a.page, text: p.a.text },
          claim_b: { page: p.b.page, text: p.b.text },
          heuristic_reason: p.reason,
          suggested_resolution:
            j.suggested_resolution ||
            'Human review required; judge did not suggest a resolution.',
          notes: j.notes || '',
        }
      })
    } catch (e) {
      llmError = String(e?.message || e)
      if (requireLlm) {
        console.error('LLM required but failed:', llmError)
        process.exit(2)
      }
      findings = offlineJudge(pairs)
    }
  } else {
    findings = offlineJudge(pairs)
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const reportName = useFixture
    ? `judge-fixture-${stamp}.json`
    : `judge-${stamp}.json`
  const reportPath = path.join(reportsDir, reportName)
  const latestPath = path.join(
    reportsDir,
    useFixture ? 'judge-fixture-latest.json' : 'judge-latest.json',
  )

  const report = {
    generated_at: new Date().toISOString(),
    tool: 'brain:judge',
    mode,
    dry_run: !apply,
    corpus: useFixture ? 'fixture' : 'wiki',
    corpus_root: path.relative(repoRoot, corpusRoot),
    omniroute_base: omniBase,
    llm_error: llmError,
    stats: {
      pages_scanned: pages,
      claims_extracted: claims.length,
      candidate_pairs: pairs.length,
      findings: findings.length,
      contradictions: findings.filter((f) => f.contradiction).length,
    },
    note:
      'Advisory only. Heuristic brain:lint stays authoritative for structure. ' +
      'This judge never auto-merges wiki edits; --apply writes proposals only.',
    findings,
  }

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n')
  fs.writeFileSync(latestPath, JSON.stringify(report, null, 2) + '\n')

  let proposalPath = null
  if (apply) {
    ensureDir(proposalsDir)
    proposalPath = path.join(
      proposalsDir,
      useFixture ? `fixture-proposals-${stamp}.json` : `proposals-${stamp}.json`,
    )
    const proposals = findings
      .filter((f) => f.contradiction)
      .map((f) => ({
        id: f.id,
        action: 'review',
        pages: [f.claim_a.page, f.claim_b.page],
        suggested_resolution: f.suggested_resolution,
        status: 'pending_human',
      }))
    fs.writeFileSync(
      proposalPath,
      JSON.stringify(
        {
          generated_at: report.generated_at,
          from_report: path.basename(reportPath),
          gated: true,
          note: 'Proposals only — do not apply to wiki without human approval.',
          proposals,
        },
        null,
        2,
      ) + '\n',
    )
  }

  // Fixture golden check
  if (useFixture) {
    const goldenPath = path.join(fixturesDir, 'golden-findings.json')
    if (fs.existsSync(goldenPath)) {
      const golden = JSON.parse(fs.readFileSync(goldenPath, 'utf8'))
      const got = findings.filter((f) => f.contradiction).map((f) => ({
        pages: [f.claim_a.page, f.claim_b.page].sort(),
        tokens: f.heuristic_reason,
      }))
      const expectMin = golden.expect_min_contradictions ?? 1
      if (got.length < expectMin) {
        console.error(
          `Fixture failed: expected >= ${expectMin} contradictions, got ${got.length}`,
        )
        process.exit(1)
      }
      report.fixture_ok = true
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n')
      fs.writeFileSync(latestPath, JSON.stringify(report, null, 2) + '\n')
    }
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        mode,
        dry_run: !apply,
        report: path.relative(repoRoot, reportPath),
        latest: path.relative(repoRoot, latestPath),
        proposal: proposalPath ? path.relative(repoRoot, proposalPath) : null,
        stats: report.stats,
        llm_error: llmError,
      },
      null,
      2,
    ),
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
