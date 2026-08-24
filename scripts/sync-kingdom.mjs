#!/usr/bin/env node
/**
 * Pull latest audits, venture STATUS.md / phases, and expense signals
 * from Kingdom-linked repos into public/data for the panel.
 */
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { loadRegistry } from './lib/registry.mjs'
import { syncManifests } from './lib/census.mjs'
import {
  syncArchitectureBundles,
  syncExperimentsBundles,
} from './lib/architecture.mjs'
import { attachHealthToManifests } from './lib/health.mjs'
import { syncCicdSnapshots } from './lib/cicd.mjs'
import { syncSkillGraph, rollupComicModels } from './lib/skill-graph.mjs'
import { syncResearchLab, researchExpenseRows } from './lib/research-lab.mjs'

const DRY_RUN = process.argv.includes('--dry-run')

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const home = process.env.HOME || ''
const dataDir = path.join(root, 'public', 'data')
const auditsDir = path.join(dataDir, 'audits')
fs.mkdirSync(auditsDir, { recursive: true })

const PATHS = {
  mac: path.join(home, 'Projects/mac-optimize-audit/reports/latest.json'),
  macLegacy: path.join(home, 'Projects/mac-storage-audit/reports/latest.json'),
  kill: path.join(home, 'Projects/subscription-audit/reports/latest-kill-list.txt'),
  cityRoot: path.join(home, 'ProceduralCity'),
  cityPhases: path.join(home, 'ProceduralCity/tracking/phases.json'),
  cityExpenses: path.join(home, 'ProceduralCity/tracking/expenses.jsonl'),
  waPhases: path.join(home, 'Projects/whatsapp-voice-agents/tracking/phases.json'),
  waExpenses: path.join(home, 'Projects/whatsapp-voice-agents/tracking/expenses.jsonl'),
  waRoot: path.join(home, 'Projects/whatsapp-voice-agents'),
  // Real comic venture (onceuponatime) — not the older ~/ComicEngine stub
  comic: path.join(home, 'Desktop/ComicMainEngine'),
  comicV2a: path.join(home, 'Desktop/ComicMainEngine/data/v2a_program.json'),
  comicLegacy: path.join(home, 'ComicEngine'),
  jugaadRoot: path.join(home, 'Projects/job-jugaad'),
  jugaadApps: path.join(home, 'Projects/job-jugaad/data/applications.json'),
  ventures: path.join(dataDir, 'ventures.json'),
  expenses: path.join(dataDir, 'expenses.json'),
}

function gitShowJson(repoRoot, revPath) {
  try {
    const raw = execFileSync('git', ['show', revPath], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function phasePassCount(phasesDoc) {
  if (!phasesDoc?.phases) return 0
  return phasesDoc.phases.filter((p) => p.status === 'pass').length
}

/** Prefer origin/main (or highest remote) when local checkout is a stale phase branch. */
function loadBestCityPhases() {
  const local = readJson(PATHS.cityPhases)
  const main = gitShowJson(PATHS.cityRoot, 'origin/main:tracking/phases.json')
  const candidates = []
  if (local) {
    candidates.push({
      source: 'local working tree',
      doc: local,
      passed: phasePassCount(local),
    })
  }
  if (main) {
    candidates.push({
      source: 'origin/main',
      doc: main,
      passed: phasePassCount(main),
    })
  }
  if (!candidates.length) return null
  candidates.sort((a, b) => b.passed - a.passed)
  const best = candidates[0]
  if (local && best.source !== 'local working tree') {
    console.warn(
      `City: local phases stale (${phasePassCount(local)} pass) — using ${best.source} (${best.passed} pass). Checkout origin/main or pull to refresh local.`,
    )
  }
  return best
}

const STATUS_SOURCES = [
  {
    id: 'whatsapp-voice',
    statusPath: path.join(home, 'Projects/whatsapp-voice-agents/STATUS.md'),
  },
  {
    id: 'youtube-editor',
    statusPath: path.join(home, 'Projects/youtube-editor-lab/STATUS.md'),
  },
  {
    id: 'research-frontier',
    statusPath: path.join(home, 'Projects/research-frontier-lab/STATUS.md'),
  },
  {
    id: 'beamdojo',
    statusPath: path.join(home, 'Projects/BeamDojo/STATUS.md'),
  },
  {
    id: 'job-jugaad',
    statusPath: path.join(home, 'Projects/job-jugaad/STATUS.md'),
  },
  {
    id: 'mac-optimize-audit',
    statusPath: path.join(home, 'Projects/mac-optimize-audit/STATUS.md'),
  },
]

function readJson(p, fallback = null) {
  if (!fs.existsSync(p)) return fallback
  return JSON.parse(fs.readFileSync(p, 'utf8'))
}

function writeJson(p, value) {
  fs.writeFileSync(p, JSON.stringify(value, null, 2) + '\n')
}

function parseStatusMd(text) {
  const get = (label) => {
    const re = new RegExp(`\\*\\*${label}:\\*\\*\\s*(.+)`, 'i')
    const m = text.match(re)
    return m ? m[1].trim() : null
  }
  const version = get('Version')
  const progressRaw = get('Progress')
  const priorityRaw = get('Priority')
  const progress = progressRaw
    ? Number(String(progressRaw).replace(/[^0-9.]/g, ''))
    : null
  let priority = null
  if (priorityRaw) {
    const p = priorityRaw.match(/P[012]|parked/i)
    priority = p ? p[0].toUpperCase().replace('PARKED', 'parked') : null
    if (priority === 'PARKED') priority = 'parked'
  }
  const nextTasks = []
  const taskBlock = text.split(/##\s*Next 3 tasks/i)[1]
  if (taskBlock) {
    for (const line of taskBlock.split('\n')) {
      const m = line.match(/^\d+\.\s+(.+)/)
      if (m) nextTasks.push(m[1].trim())
    }
  }
  return {
    version,
    progress: Number.isFinite(progress) ? progress : null,
    priority,
    nextMilestone: nextTasks[0] || null,
    notes: nextTasks.length
      ? `Next: ${nextTasks.map((t, i) => `${i + 1}) ${t}`).join(' · ')}`
      : null,
  }
}

function writeStatusMd(filePath, fields) {
  const lines = [
    '# STATUS',
    '',
    `- **Version:** ${fields.version}`,
    `- **Agent:** ${fields.agent}`,
    `- **Progress:** ${fields.progress}%`,
    `- **Priority:** ${fields.priority}`,
    '',
    '## Next 3 tasks',
  ]
  for (let i = 0; i < 3; i++) {
    lines.push(`${i + 1}. ${fields.tasks[i] || 'TBD'}`)
  }
  lines.push('')
  try {
    fs.writeFileSync(filePath, lines.join('\n'))
    return true
  } catch (err) {
    console.warn(
      'Skip STATUS write',
      filePath,
      '—',
      err instanceof Error ? err.message : err,
    )
    return false
  }
}

function syncMac() {
  const macPath = fs.existsSync(PATHS.mac) ? PATHS.mac : PATHS.macLegacy
  if (!fs.existsSync(macPath)) {
    console.warn('No mac latest.json at', PATHS.mac)
    return null
  }
  const mac = JSON.parse(fs.readFileSync(macPath, 'utf8'))
  const isOptimize = mac.schema === 'mac-optimize-audit.v1' || Boolean(mac.memory)
  const vol = mac.results?.volumes?.extra || {}
  const summary = isOptimize
    ? {
        generated_at: mac.generated_at,
        source: macPath,
        dashboard: 'http://127.0.0.1:8742',
        disk: mac.disk || {
          note: '',
          percent_used: 0,
          total_bytes: 0,
          used_bytes: 0,
          free_bytes: 0,
        },
        memory: mac.memory || null,
        cpu: mac.cpu || null,
        health: mac.health || null,
        host: mac.host || null,
        app_groups: (mac.app_groups || []).slice(0, 8),
        top_cpu: (mac.top_cpu || []).slice(0, 8),
        top_home: (mac.hotspots || mac.top_home || []).slice(0, 8).map((i) => ({
          path: i.path,
          bytes: i.bytes,
        })),
        recommendations: (mac.recommendations || []).map((r) => ({
          priority: r.priority,
          title: r.title,
          bytes: r.bytes || 0,
          risk: r.risk,
          action: r.action,
          rationale: r.rationale,
        })),
        cleaners: mac.cleaners || [],
      }
    : {
        generated_at: mac.generated_at,
        source: macPath,
        dashboard: 'http://127.0.0.1:8742',
        disk: {
          note: mac.results?.volumes?.notes?.[0] || '',
          percent_used: vol.percent_used,
          total_bytes: vol.total,
          used_bytes: vol.used,
          free_bytes: vol.free,
        },
        memory: null,
        cpu: null,
        health: null,
        host: null,
        app_groups: [],
        top_cpu: [],
        top_home: (mac.results?.home?.items || []).slice(0, 8).map((i) => ({
          path: i.path,
          bytes: i.bytes,
        })),
        recommendations: (mac.recommendations || []).map((r) => ({
          priority: r.priority,
          title: r.title,
          bytes: r.bytes,
          risk: r.risk,
          action: r.action,
          rationale: r.rationale,
        })),
        cleaners: [],
      }
  writeJson(path.join(auditsDir, 'mac-storage-summary.json'), summary)
  const grade = summary.health?.grade
  const score = summary.health?.score
  console.log(
    'Wrote mac-storage-summary.json',
    grade ? `· health ${grade} ${score}` : '',
  )
  return summary
}

function parseKillList() {
  if (!fs.existsSync(PATHS.kill)) {
    console.warn('No subscription kill list at', PATHS.kill)
    return null
  }
  const killText = fs.readFileSync(PATHS.kill, 'utf8')
  const lines = killText.trim().split('\n')
  const items = []
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line || line.startsWith('http')) continue
    if (line.includes('|')) {
      const parts = line.split('|').map((s) => s.trim())
      const next = lines[i + 1]?.trim()
      items.push({
        name: parts[0],
        cadence: parts[1],
        annual: parts[2],
        source: parts[3],
        cancel_url: next?.startsWith('http') ? next : '',
      })
    }
  }
  const payload = {
    generated_from: lines[0],
    annual_estimate: lines[1],
    source_path: PATHS.kill,
    items,
  }
  writeJson(path.join(auditsDir, 'subscription-kill-list.json'), payload)
  console.log('Wrote subscription-kill-list.json (', items.length, 'items)')
  return payload
}

function monthlyFromCadence(cadence, annual) {
  const c = String(cadence || '').toLowerCase()
  const money = Number(String(cadence).replace(/[^0-9.]/g, ''))
  if (c.includes('weekly') && Number.isFinite(money)) {
    return Math.round(((money * 52) / 12) * 100) / 100
  }
  if (c.includes('monthly') && Number.isFinite(money)) {
    return money
  }
  const annualN = Number(String(annual || '').replace(/[^0-9.]/g, ''))
  if (Number.isFinite(annualN) && annualN > 0) {
    return Math.round((annualN / 12) * 100) / 100
  }
  return Number.isFinite(money) ? money : 0
}

function categorizeSub(name) {
  const n = name.toLowerCase()
  if (n.includes('coursera')) {
    return { category: 'learning', ventureId: 'research-frontier' }
  }
  if (n.includes('openai') || n.includes('claude') || n.includes('anthropic')) {
    return { category: 'api', ventureId: 'kingdom-ops' }
  }
  if (n.includes('cursor') || n.includes('jobright') || n.includes('rocket')) {
    return { category: 'tools', ventureId: 'kingdom-ops' }
  }
  if (n.includes('comcast') || n.includes('xfinity') || n.includes('apple')) {
    return { category: 'infra', ventureId: 'kingdom-ops' }
  }
  return { category: 'other', ventureId: 'kingdom-ops' }
}

function slug(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
}

function progressFromPhases(passed, total) {
  const t = total || 1
  return Math.round((100 * passed) / t)
}

function syncWhatsAppStatus() {
  const phases = readJson(PATHS.waPhases)
  if (!phases) {
    console.warn('No WA phases.json at', PATHS.waPhases)
    return null
  }
  const list = phases.phases || []
  const total = list.length || 1
  const passed = list.filter((p) => p.status === 'pass').length
  const current = list.find((p) => p.id === phases.current_phase) || null
  const lastEval =
    [...list].reverse().find((p) => p.evaluation?.result)?.evaluation || null
  const progress = Math.max(12, progressFromPhases(passed, total))
  const version = `Stage ${current?.stage || phases.stages?.[0]?.id || '?'} · Phase ${phases.current_phase}`
  const next = current
    ? `Phase ${current.id}: ${current.name} (${current.status})`
    : 'Continue next phase'
  const spend = list.reduce((s, p) => s + Number(p.cost_usd || 0), 0)
  const spendUsd = Math.round(spend * 100) / 100
  const ceilingUsd = phases.ceiling_usd ?? 40
  const summary = {
    synced_at: new Date().toISOString(),
    source: PATHS.waPhases,
    vertical: phases.vertical || 'real-estate',
    ceiling_usd: ceilingUsd,
    spend_usd: spendUsd,
    current_phase: phases.current_phase,
    stage: current?.stage || null,
    stage_name: current?.stage_name || null,
    passed,
    total,
    progress,
    version,
    next_milestone: next,
    last_evaluation: lastEval
      ? {
          result: lastEval.result,
          measured: lastEval.measured,
          threshold: lastEval.threshold,
          date: lastEval.date,
        }
      : null,
    stages: phases.stages || [],
    phases: list.map((p) => ({
      id: p.id,
      name: p.name,
      stage: p.stage,
      status: p.status,
      evaluation: p.evaluation
        ? { result: p.evaluation.result, date: p.evaluation.date }
        : null,
    })),
  }
  writeJson(path.join(auditsDir, 'whatsapp-phases.json'), summary)

  writeStatusMd(path.join(PATHS.waRoot, 'STATUS.md'), {
    version,
    agent: 'Agent Cash',
    progress,
    priority: 'P0',
    tasks: [
      next,
      'Hindi/English qualify → site visit for brokers',
      'Sync Kingdom after each gate (npm run sync)',
    ],
  })

  console.log('WA phases summary ·', version, progress + '%', 'spend $' + summary.spend_usd)
  return {
    version,
    progress,
    priority: 'P0',
    status: 'active',
    nextMilestone: next,
    notes: `RE vertical · ${passed}/${total} phases pass · last gate ${lastEval?.result || 'n/a'} · spend $${spendUsd}/$${ceilingUsd}`,
    progressSource: `phases ${passed}/${total} from tracking/phases.json`,
    phasesPassed: passed,
    phasesTotal: total,
    spendUsd,
    ceilingUsd,
  }
}

function syncCityStageProofs() {
  const dataJs = path.join(PATHS.cityRoot, 'dashboard/data.js')
  const refreshPy = path.join(PATHS.cityRoot, 'scripts/refresh_dashboard.py')
  // Prefer a fresh regenerate so walkthrough MP4s land in stage_proofs.
  if (fs.existsSync(refreshPy)) {
    try {
      execFileSync('python3', [refreshPy], {
        cwd: PATHS.cityRoot,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 120_000,
      })
    } catch (e) {
      console.warn('City refresh_dashboard failed:', e.message)
    }
  }
  if (!fs.existsSync(dataJs)) {
    console.warn('No city dashboard/data.js — skip stage proofs sync')
    return null
  }
  const text = fs.readFileSync(dataJs, 'utf8')
  const marker = 'window.DASHBOARD_DATA = '
  const idx = text.indexOf(marker)
  if (idx < 0) {
    console.warn('City data.js missing DASHBOARD_DATA')
    return null
  }
  let payload = text.slice(idx + marker.length).trim()
  if (payload.endsWith(';')) payload = payload.slice(0, -1)
  let doc
  try {
    doc = JSON.parse(payload)
  } catch (e) {
    console.warn('City data.js JSON parse failed:', e.message)
    return null
  }
  const proofs = Array.isArray(doc.stage_proofs) ? doc.stage_proofs : []
  const out = {
    synced_at: new Date().toISOString(),
    source: dataJs,
    generated_at: doc.generated_at || null,
    count: proofs.length,
    proofs,
  }
  writeJson(path.join(auditsDir, 'city-stage-proofs.json'), out)
  console.log('City stage proofs ·', proofs.length, 'rows')
  return out
}

function syncCityStatus() {
  const best = loadBestCityPhases()
  if (!best) {
    console.warn('No city phases.json (local or origin/main)')
    return null
  }
  const phases = best.doc
  const total = phases.phases?.length || 92
  const passed = phasePassCount(phases)
  const current =
    (phases.phases || []).find((p) => p.id === phases.current_phase) || null
  const progress = progressFromPhases(passed, total)
  const version = `Stage ${current?.stage || '?'} · Phase ${phases.current_phase}`
  const next = current
    ? `Phase ${current.id}: ${current.name} (${current.status})`
    : 'Continue next phase'
  const ceilingUsd = Number(phases.ceiling_usd) || 70
  const patch = {
    version,
    progress,
    priority: 'P1',
    status: 'active',
    nextMilestone: next,
    notes: `City · ${passed}/${total} pass · source ${best.source} · updated ${phases.updated_at || 'n/a'} · ceiling $${ceilingUsd}`,
    progressSource: `phases ${passed}/${total} from ${best.source}`,
    phasesPassed: passed,
    phasesTotal: total,
    spendUsd: null,
    ceilingUsd,
  }
  writeJson(path.join(auditsDir, 'city-phases.json'), {
    synced_at: new Date().toISOString(),
    source: best.source,
    current_phase: phases.current_phase,
    stage: current?.stage || null,
    stage_name: current?.stage_name || null,
    passed,
    total,
    progress,
    version,
    next_milestone: next,
    updated_at: phases.updated_at || null,
    ceiling_usd: ceilingUsd,
    local_stale: best.source !== 'local working tree',
  })
  syncCityStageProofs()
  writeStatusMd(path.join(PATHS.cityRoot, 'STATUS.md'), {
    version,
    agent: 'Agent Metro',
    progress,
    priority: 'P1',
    tasks: [
      next,
      'Keep fal/Gemini spend under $70 ceiling',
      'Local checkout may lag origin/main — pull/checkout main for full tree',
    ],
  })
  console.log(
    'City status patch ·',
    version,
    progress + '%',
    `(${passed}/${total} via ${best.source})`,
  )
  return patch
}

function readComicTasks(comicRoot) {
  const dbPath = path.join(comicRoot, 'data/usage.db')
  if (!fs.existsSync(dbPath)) return null
  try {
    const raw = execFileSync(
      'python3',
      [
        '-c',
        `
import json, sqlite3
con = sqlite3.connect(${JSON.stringify(dbPath)})
tasks = [
  {"id": r[0], "title": r[1], "status": r[2], "progress": r[3], "sort_order": r[4], "phase": r[5]}
  for r in con.execute(
    "select id, title, status, progress, sort_order, phase from task order by sort_order"
  )
]
spend = con.execute("select coalesce(sum(cost_usd),0), count(*) from api_call").fetchone()
print(json.dumps({"tasks": tasks, "spend_usd": spend[0], "api_calls": spend[1]}))
`,
      ],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    )
    return JSON.parse(raw)
  } catch (e) {
    console.warn('ComicMainEngine usage.db read failed', e.message || e)
    return null
  }
}

function readV2aProgram() {
  return readJson(PATHS.comicV2a)
}

function v1TaskCounts(snap) {
  const tasks = snap?.tasks || []
  const total = tasks.length
  const passed = tasks.filter(
    (t) => t.status === 'completed' || Number(t.progress) >= 1,
  ).length
  return { passed, total }
}

function syncComicStatus() {
  const comicRoot = PATHS.comic
  if (!fs.existsSync(comicRoot)) {
    console.warn('No ComicMainEngine at', comicRoot)
    if (fs.existsSync(PATHS.comicLegacy)) {
      console.warn(
        'Found legacy ~/ComicEngine — Kingdom now tracks ~/Desktop/ComicMainEngine',
      )
    }
    return null
  }
  const snap = readComicTasks(comicRoot)
  const v2a = readV2aProgram()
  const v1 = v1TaskCounts(snap)
  const spendUsd = snap
    ? Math.round(Number(snap.spend_usd || 0) * 100) / 100
    : null

  let passed = v1.passed
  let total = v1.total
  let progress = 0
  let next = 'Open ComicMainEngine dashboard'
  let version = 'ComicMainEngine'
  let progressSource = 'fallback — missing v2a_program.json and usage.db'
  let v2aAudit = null

  const phaseIds = v2a?.phase_ids || []
  const phaseMap = v2a?.phases || {}
  const v2aPhases = phaseIds.map((id) => phaseMap[id]).filter(Boolean)

  if (v2aPhases.length) {
    const done = v2aPhases.filter((p) => p.status === 'complete')
    const nextPhase =
      v2aPhases.find((p) => p.status !== 'complete') ||
      phaseMap[v2a.program?.active_phase_id]
    passed = done.length
    total = v2aPhases.length
    progress = progressFromPhases(passed, total)
    const lastDone = [...done].sort(
      (a, b) => (a.sort_order || 0) - (b.sort_order || 0),
    ).at(-1)
    const nextLabel = nextPhase
      ? `${String(nextPhase.id).toUpperCase()} ${nextPhase.title}`
      : 'complete'
    version = lastDone
      ? `2A · ${String(lastDone.id).toUpperCase()} passed · ${nextLabel}`
      : `2A · ${nextLabel}`
    if (nextPhase) {
      const startHint = nextPhase.status === 'locked' ? ' (start)' : ''
      next = `${String(nextPhase.id).toUpperCase()} ${nextPhase.title}${startHint}`
    } else {
      next = 'Version 2A complete'
    }
    progressSource = `v2a_program.json ${passed}/${total} phases complete (V1 usage.db ${v1.passed}/${v1.total || 0})`
    v2aAudit = {
      active_phase_id: v2a.program?.active_phase_id ?? null,
      phases: v2aPhases.map((p) => ({
        id: p.id,
        title: p.title,
        status: p.status,
      })),
    }
  } else if (snap?.tasks?.length) {
    progress = progressFromPhases(v1.passed, v1.total)
    const pending = snap.tasks.find(
      (t) => t.status !== 'completed' && Number(t.progress) < 1,
    )
    if (pending) {
      next = `${pending.id}: ${pending.title}`
      version = `ComicMainEngine · ${pending.phase || pending.id}`
    } else {
      next = 'V1 task board complete — start Version 2A (v2a_program.json missing)'
      version = 'ComicMainEngine · V1 board complete'
    }
    progressSource = `tasks ${v1.passed}/${v1.total} completed in usage.db`
  } else {
    progress = 50
    progressSource = 'fallback (usage.db + v2a_program.json missing)'
  }

  const patch = {
    version,
    progress,
    priority: 'P2',
    status: 'active',
    nextMilestone: next,
    notes: `ComicMainEngine @ Desktop · 2A ${v2aPhases.length ? `${passed}/${total}` : '—'} · V1 ${v1.passed}/${v1.total || '?'} · API spend $${spendUsd ?? '?'} · secondary to City`,
    progressSource,
    phasesPassed: total ? passed : null,
    phasesTotal: total || null,
    spendUsd,
    ceilingUsd: null,
  }
  writeJson(path.join(auditsDir, 'comic-tasks.json'), {
    synced_at: new Date().toISOString(),
    repo: comicRoot,
    ...patch,
    api_calls: snap?.api_calls ?? null,
    v1_tasks: v1,
    v2a: v2aAudit,
  })
  writeStatusMd(path.join(comicRoot, 'STATUS.md'), {
    version,
    agent: 'Agent Ink',
    progress,
    priority: 'P2',
    tasks: [
      next,
      'Keep Version 2 frozen (do not edit data/v2_program.json from 2A work)',
      'Do not outrank City P1 this week',
    ],
  })
  console.log(
    'ComicMainEngine status ·',
    version,
    progress + '%',
    total ? `(${passed}/${total} 2A phases)` : '',
  )
  return patch
}

function syncKingdomOpsStatus(sub, mac) {
  const killCount = sub?.items?.length ?? 0
  const disk = mac?.disk?.percent_used
  const version = 'v1.0'
  const progress = 70
  const next =
    killCount > 0
      ? `Cancel/review ${killCount} kill-list seats; reclaim low-risk disk${disk != null ? ` (${disk}% used)` : ''}`
      : 'Run subscription + storage audits, then re-sync'
  writeStatusMd(path.join(root, 'STATUS.md'), {
    version,
    agent: 'Agent Steward',
    progress,
    priority: 'P1',
    tasks: [
      next,
      'Keep monthly token cap ≤ $250',
      'Export Kingdom state weekly',
    ],
  })
  return {
    version,
    progress,
    priority: 'P1',
    status: 'active',
    nextMilestone: next,
    notes: 'Subscription kill list lives here. Mac speed is the mac-optimize-audit province.',
    progressSource: 'heuristic ops readiness 70% (audits live; kill seats still open)',
    phasesPassed: null,
    phasesTotal: null,
    spendUsd: null,
    ceilingUsd: 250,
  }
}

function syncJobJugaadApplications() {
  const doc = readJson(PATHS.jugaadApps)
  if (!doc) {
    console.warn('No Job Jugaad applications at', PATHS.jugaadApps)
    return null
  }
  const apps = doc.applications || []
  const target = Math.max(Number(doc.target) || 30, 1)
  const counts = {
    wishlist: 0,
    applied: 0,
    interviewing: 0,
    offer: 0,
    rejected: 0,
    ghosted: 0,
  }
  for (const a of apps) {
    if (counts[a.status] != null) counts[a.status] += 1
  }
  const appliedOrBeyond = apps.filter((a) =>
    ['applied', 'interviewing', 'offer', 'rejected', 'ghosted'].includes(
      a.status,
    ),
  ).length
  const audit = {
    synced_at: new Date().toISOString(),
    target,
    total: apps.length,
    applied_or_beyond: appliedOrBeyond,
    counts,
    recent: apps.slice(0, 12).map((a) => ({
      id: a.id,
      company: a.company,
      role: a.role,
      status: a.status,
      appliedAt: a.appliedAt ?? null,
    })),
  }
  writeJson(path.join(auditsDir, 'job-jugaad-applications.json'), audit)
  console.log(
    'Job Jugaad audit ·',
    appliedOrBeyond + '/' + target,
    'applied+ ·',
    apps.length,
    'rows',
  )
  return audit
}

function syncVentures({ sub, mac }) {
  const ventures = readJson(PATHS.ventures, [])
  const patches = {}

  for (const src of STATUS_SOURCES) {
    if (src.id === 'whatsapp-voice') continue
    if (!fs.existsSync(src.statusPath)) {
      console.warn('Missing STATUS.md', src.statusPath)
      continue
    }
    const parsed = parseStatusMd(fs.readFileSync(src.statusPath, 'utf8'))
    patches[src.id] = {
      ...parsed,
      status: parsed.priority === 'parked' ? 'parked' : 'active',
      progressSource: 'STATUS.md Progress field (agent-updated)',
      phasesPassed: null,
      phasesTotal: null,
      spendUsd: null,
      ceilingUsd: null,
    }
    console.log('Status', src.id, '→', parsed.version, parsed.progress + '%')
  }

  const wa = syncWhatsAppStatus()
  if (wa) patches['whatsapp-voice'] = wa

  const city = syncCityStatus()
  if (city) patches['procedural-city'] = city

  const comic = syncComicStatus()
  if (comic) patches['comic-engine'] = comic

  syncJobJugaadApplications()

  patches['kingdom-ops'] = syncKingdomOpsStatus(sub, mac)

  const next = ventures.map((v) => {
    if (v.id === 'shorts') {
      return {
        ...v,
        priority: 'parked',
        status: 'parked',
        progress: 0,
        progressSource: 'portfolio decision (parked)',
        phasesPassed: null,
        phasesTotal: null,
      }
    }
    const p = patches[v.id]
    if (!p) return { ...v, status: v.priority === 'parked' ? 'parked' : 'active' }
    const priority = p.priority ?? v.priority
    const renamed =
      v.id === 'comic-engine'
        ? {
            name: 'ComicMainEngine',
            repoPath: PATHS.comic,
          }
        : {}
    return {
      ...v,
      ...renamed,
      version: p.version ?? v.version,
      progress: p.progress ?? v.progress,
      priority,
      status: priority === 'parked' ? 'parked' : 'active',
      nextMilestone: p.nextMilestone ?? v.nextMilestone,
      notes: p.notes ?? v.notes,
      progressSource: p.progressSource ?? null,
      phasesPassed: p.phasesPassed ?? null,
      phasesTotal: p.phasesTotal ?? null,
      spendUsd: p.spendUsd ?? null,
      ceilingUsd: p.ceilingUsd ?? null,
    }
  })

  if (patches.beamdojo && !next.some((v) => v.id === 'beamdojo')) {
    next.push({
      id: 'beamdojo',
      name: 'BeamDojo (Isaac Lab locomotion)',
      version: patches.beamdojo.version ?? 'Stage 1',
      progress: patches.beamdojo.progress ?? 0,
      priority: patches.beamdojo.priority ?? 'P1',
      status: 'active',
      weight: 6,
      agentId: 'agent-dojo',
      repoPath: path.join(home, 'Projects/BeamDojo'),
      nextMilestone: patches.beamdojo.nextMilestone ?? 'Dual-terrain Stage 1 then 1024-env CUDA train',
      notes: patches.beamdojo.notes ?? 'GPU locomotion research. Checkpoints stay off git.',
      progressSource: patches.beamdojo.progressSource ?? null,
      phasesPassed: null,
      phasesTotal: null,
      spendUsd: null,
      ceilingUsd: null,
    })
  }

  const syncedAt = new Date().toISOString()
  writeJson(PATHS.ventures, next)
  writeJson(path.join(auditsDir, 'ventures-sync.json'), {
    synced_at: syncedAt,
    patches,
  })

  const board = {
    synced_at: syncedAt,
    progress_rules: {
      'whatsapp-voice': 'phases_pass / phases_total (from tracking/phases.json)',
      'procedural-city':
        'phases_pass / phases_total — prefer origin/main when local phase branch is stale',
      'comic-engine':
        'v2a_program.json phases complete / total when present; else usage.db V1 tasks (not ~/ComicEngine)',
      'youtube-editor': 'STATUS.md **Progress** field',
      'research-frontier': 'STATUS.md **Progress** field',
      beamdojo: 'STATUS.md **Progress** field (Isaac Lab GPU smokes / trains)',
      'job-jugaad':
        'STATUS.md Progress = applied-or-beyond / target from data/applications.json',
      'kingdom-ops': 'heuristic ops readiness (70%) until kill-list closure tracked',
      'mac-optimize-audit':
        'STATUS.md Progress from health score after python3 -m mac_optimize audit',
      shorts: 'always 0 · parked',
    },
    burn_rules: {
      monthly_budget_usd: 'portfolio.json monthlyBudgetUsd',
      tracked_burn:
        'sum(USD expenses including synced kill-list monthly estimates + venture API jsonl) + sum(tokens.entries.usd)',
      not_included: 'agent.tokenUsedUsd dials are display caps/used hints, not double-counted in throne burn',
    },
    ventures: next.map((v) => ({
      id: v.id,
      name: v.name,
      version: v.version,
      progress: v.progress,
      priority: v.priority,
      status: v.status,
      nextMilestone: v.nextMilestone,
      progressSource: v.progressSource ?? null,
      phasesPassed: v.phasesPassed ?? null,
      phasesTotal: v.phasesTotal ?? null,
      spendUsd: v.spendUsd ?? null,
      ceilingUsd: v.ceilingUsd ?? null,
      notes: v.notes,
      repoPath: v.repoPath,
    })),
  }
  writeJson(path.join(auditsDir, 'phases-board.json'), board)
  writeBrainLiveTracker(board)
  console.log('Updated ventures.json + phases-board + brain live-tracker')
  return next
}

function writeBrainLiveTracker(board) {
  const out = path.join(root, 'brain/wiki/ops/live-tracker.md')
  const lines = [
    '---',
    'type: overview',
    `updated: ${board.synced_at.slice(0, 10)}`,
    'tags: [tracker, sync, citizens]',
    '---',
    '',
    '# Live tracker',
    '',
    `Auto-written by \`npm run sync\` at **${board.synced_at}**. Do not hand-edit — re-run sync after venture gates.`,
    '',
    '## How progress is calculated',
    '',
    '| Venture | Formula |',
    '|---------|---------|',
    ...Object.entries(board.progress_rules).map(
      ([id, rule]) => `| \`${id}\` | ${rule} |`,
    ),
    '',
    '## How budget / burn is calculated',
    '',
    `- **Monthly budget:** \`$portfolio.monthlyBudgetUsd\` (see \`public/data/portfolio.json\`).`,
    `- **Tracked burn:** ${board.burn_rules.tracked_burn}.`,
    `- **Note:** ${board.burn_rules.not_included}.`,
    '',
    '## Ventures (synced)',
    '',
    '| Venture | Version | Progress | Phases | Priority | Next |',
    '|---------|---------|----------|--------|----------|------|',
  ]
  for (const v of board.ventures) {
    const phases =
      v.phasesPassed != null && v.phasesTotal != null
        ? `${v.phasesPassed}/${v.phasesTotal}`
        : '—'
    lines.push(
      `| ${v.name} | ${v.version} | ${v.progress}% | ${phases} | ${v.priority} · ${v.status} | ${v.nextMilestone} |`,
    )
  }
  lines.push(
    '',
    '## Sources',
    '',
    '- Panel JSON: `public/data/ventures.json`',
    '- Board audit: `public/data/audits/phases-board.json`',
    '- Citizens map: [[overview]]',
    '',
  )
  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.writeFileSync(out, lines.join('\n'))
}

function syncExpenses(sub, registry) {
  const existing = readJson(PATHS.expenses, [])
  const manual = existing.filter((e) => !String(e.id).startsWith('sync-'))
  const synced = []
  const today = new Date().toISOString().slice(0, 10)

  if (sub?.items?.length) {
    for (const item of sub.items) {
      const amount = monthlyFromCadence(item.cadence, item.annual)
      if (!amount) continue
      const { category, ventureId } = categorizeSub(item.name)
      synced.push({
        id: `sync-sub-${slug(item.name)}`,
        date: today,
        category,
        label: `${item.name} (est. monthly)`,
        amount,
        currency: 'USD',
        ventureId,
        notes: `Synced from kill list · ${item.cadence} · ${item.annual}`,
      })
    }
  }

  if (fs.existsSync(PATHS.cityExpenses)) {
    const rows = fs
      .readFileSync(PATHS.cityExpenses, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line))
      .filter(
        (r) =>
          Number(r.actual_usd) > 0 &&
          r.source !== 'omniroute' &&
          r.model !== 'connection-test',
      )
    const total = rows.reduce((s, r) => s + Number(r.actual_usd), 0)
    if (total > 0) {
      synced.push({
        id: 'sync-city-api',
        date: today,
        category: 'api',
        label: 'Procedural City API (fal / Gemini)',
        amount: Math.round(total * 100) / 100,
        currency: 'USD',
        ventureId: 'procedural-city',
        notes: `Synced from tracking/expenses.jsonl · ${rows.length} billable rows`,
      })
    }
  }

  if (fs.existsSync(PATHS.waExpenses)) {
    const rows = fs
      .readFileSync(PATHS.waExpenses, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line))
      .filter(
        (r) =>
          Number(r.actual_usd) > 0 &&
          r.source !== 'omniroute' &&
          r.model !== 'connection-test',
      )
    const total = rows.reduce((s, r) => s + Number(r.actual_usd), 0)
    const waPhases = readJson(PATHS.waPhases)
    const ceiling = waPhases?.ceiling_usd ?? 40
    synced.push({
      id: 'sync-wa-api',
      date: today,
      category: 'api',
      label: 'WhatsApp Agent Cash API spend',
      amount: Math.round(total * 100) / 100,
      currency: 'USD',
      ventureId: 'whatsapp-voice',
      notes: `Synced from WA expenses.jsonl · ${rows.length} billable · ceiling $${ceiling}`,
    })
  }

  synced.push(...researchExpenseRows(registry ?? { ventures: [] }, today))

  const next = [...synced, ...manual]
  writeJson(PATHS.expenses, next)
  writeJson(path.join(auditsDir, 'expenses-sync.json'), {
    synced_at: new Date().toISOString(),
    synced_count: synced.length,
    manual_count: manual.length,
  })
  console.log(
    'Updated expenses.json ·',
    synced.length,
    'synced +',
    manual.length,
    'manual',
  )
  return next
}

const mac = syncMac()
const sub = parseKillList()
const ventures = syncVentures({ sub, mac })
const registry = loadRegistry(root)
syncExpenses(sub, registry)

if (!DRY_RUN) {
  writeJson(path.join(dataDir, 'venture-registry.json'), registry)
  syncManifests(registry, root, ventures, dataDir)
  rollupComicModels(root, dataDir)
  syncArchitectureBundles(registry, root, dataDir)
  syncExperimentsBundles(registry, root, dataDir)
  attachHealthToManifests(registry, dataDir)
  syncCicdSnapshots(registry, dataDir)
  const agents = readJson(path.join(dataDir, 'agents.json')) ?? []
  syncSkillGraph(registry, root, dataDir, agents)
  syncResearchLab(registry, root, dataDir, ventures)
} else {
  console.log('Dry run — skipped orchestrator manifests')
}

console.log('Kingdom sync complete.')
