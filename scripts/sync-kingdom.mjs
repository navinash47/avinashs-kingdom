#!/usr/bin/env node
/**
 * Pull latest audits, venture STATUS.md / phases, and expense signals
 * from Kingdom-linked repos into public/data for the panel.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const home = process.env.HOME || ''
const dataDir = path.join(root, 'public', 'data')
const auditsDir = path.join(dataDir, 'audits')
fs.mkdirSync(auditsDir, { recursive: true })

const PATHS = {
  mac: path.join(home, 'Projects/mac-storage-audit/reports/latest.json'),
  kill: path.join(home, 'Projects/subscription-audit/reports/latest-kill-list.txt'),
  cityPhases: path.join(home, 'ProceduralCity/tracking/phases.json'),
  cityExpenses: path.join(home, 'ProceduralCity/tracking/expenses.jsonl'),
  comic: path.join(home, 'ComicEngine'),
  ventures: path.join(dataDir, 'ventures.json'),
  expenses: path.join(dataDir, 'expenses.json'),
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
  if (!fs.existsSync(PATHS.mac)) {
    console.warn('No mac latest.json at', PATHS.mac)
    return null
  }
  const mac = JSON.parse(fs.readFileSync(PATHS.mac, 'utf8'))
  const vol = mac.results?.volumes?.extra || {}
  const summary = {
    generated_at: mac.generated_at,
    source: PATHS.mac,
    disk: {
      note: mac.results?.volumes?.notes?.[0] || '',
      percent_used: vol.percent_used,
      total_bytes: vol.total,
      used_bytes: vol.used,
      free_bytes: vol.free,
    },
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
  }
  writeJson(path.join(auditsDir, 'mac-storage-summary.json'), summary)
  console.log('Wrote mac-storage-summary.json')
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

function syncCityStatus() {
  const phases = readJson(PATHS.cityPhases)
  if (!phases) {
    console.warn('No city phases.json')
    return null
  }
  const total = phases.phases?.length || 92
  const passed = (phases.phases || []).filter((p) => p.status === 'pass').length
  const current =
    (phases.phases || []).find((p) => p.id === phases.current_phase) || null
  const progress = Math.round((100 * passed) / total)
  const version = `Stage ${current?.stage || '?'} · Phase ${phases.current_phase}`
  const next = current
    ? `Phase ${current.id}: ${current.name} (${current.status})`
    : 'Continue next phase'
  const patch = {
    version,
    progress,
    priority: 'P1',
    status: 'active',
    nextMilestone: next,
    notes: `City tracking: ${passed}/${total} phases pass · updated ${phases.updated_at || 'n/a'}`,
  }
  writeStatusMd(path.join(home, 'ProceduralCity/STATUS.md'), {
    version,
    agent: 'Agent Metro',
    progress,
    priority: 'P1',
    tasks: [
      next,
      'Keep fal/Gemini spend under $70 ceiling',
      'City before Comic while Comic stays V1',
    ],
  })
  console.log('City status patch ·', version, progress + '%')
  return patch
}

function syncComicStatus() {
  const comicRoot = PATHS.comic
  if (!fs.existsSync(comicRoot)) {
    console.warn('No ComicEngine at', comicRoot)
    return null
  }
  const hasP2 =
    fs.existsSync(path.join(comicRoot, 'progress_notes_for_phase2_2.md')) ||
    fs.existsSync(path.join(comicRoot, 'runs/phase2'))
  const version = hasP2 ? 'V1 · Phase 2.2' : 'V1'
  const progress = hasP2 ? 55 : 40
  const next = hasP2
    ? 'Improve consistency pipeline after City P1 milestones'
    : 'Finish Phase 2 style lock + cost logs'
  const patch = {
    version,
    progress,
    priority: 'P2',
    status: 'active',
    nextMilestone: next,
    notes: 'Secondary to City for now. Monetize via B2B later.',
  }
  writeStatusMd(path.join(comicRoot, 'STATUS.md'), {
    version,
    agent: 'Agent Ink',
    progress,
    priority: 'P2',
    tasks: [
      next,
      'Batch jobs; cache refs to cut token burn',
      'Do not outrank City this week',
    ],
  })
  console.log('Comic status patch ·', version, progress + '%')
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
    notes: 'Subscription audit + Mac storage audit live here.',
  }
}

function syncVentures({ sub, mac }) {
  const ventures = readJson(PATHS.ventures, [])
  const patches = {}

  for (const src of STATUS_SOURCES) {
    if (!fs.existsSync(src.statusPath)) {
      console.warn('Missing STATUS.md', src.statusPath)
      continue
    }
    const parsed = parseStatusMd(fs.readFileSync(src.statusPath, 'utf8'))
    patches[src.id] = parsed
    console.log('Status', src.id, '→', parsed.version, parsed.progress + '%')
  }

  const city = syncCityStatus()
  if (city) patches['procedural-city'] = city

  const comic = syncComicStatus()
  if (comic) patches['comic-engine'] = comic

  patches['kingdom-ops'] = syncKingdomOpsStatus(sub, mac)

  const next = ventures.map((v) => {
    const p = patches[v.id]
    if (!p) return v
    return {
      ...v,
      version: p.version ?? v.version,
      progress: p.progress ?? v.progress,
      priority: p.priority ?? v.priority,
      status:
        (p.priority ?? v.priority) === 'parked'
          ? 'parked'
          : (p.status ?? v.status),
      nextMilestone: p.nextMilestone ?? v.nextMilestone,
      notes: p.notes ?? v.notes,
    }
  })

  writeJson(PATHS.ventures, next)
  writeJson(path.join(auditsDir, 'ventures-sync.json'), {
    synced_at: new Date().toISOString(),
    patches,
  })
  console.log('Updated ventures.json')
  return next
}

function syncExpenses(sub) {
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
syncVentures({ sub, mac })
syncExpenses(sub)
console.log('Kingdom sync complete.')
