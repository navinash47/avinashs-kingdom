import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { expandHome } from './registry.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const AGENT_SKILL_MAP = {
  'agent-cash': ['log-outreach', 'phase-gate', 'sync-kingdom', 'kingdom-tunnels'],
  'agent-cut': ['youtube-provenance', 'sync-kingdom', 'phase-gate'],
  'agent-atlas': ['kingdom-wiki', 'sync-kingdom'],
  'agent-dojo': ['sync-kingdom', 'kingdom-wiki', 'phase-gate'],
  'agent-metro': ['phase-gate', 'sync-kingdom'],
  'agent-ink': ['phase-gate', 'sync-kingdom'],
  'agent-steward': ['kingdom-wiki', 'sync-kingdom', 'log-outreach', 'task-observer'],
  'agent-janitor': ['sync-kingdom'],
  'agent-jugaad': ['sync-kingdom', 'log-outreach'],
}

function listSkillDirs() {
  const dirs = []
  const home = process.env.HOME || ''
  const candidates = [
    path.join(home, '.cursor/skills'),
    path.join(__dirname, '../../.cursor/skills'),
  ]
  for (const d of candidates) {
    if (!fs.existsSync(d)) continue
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      if (ent.isDirectory()) {
        dirs.push({ name: ent.name, path: path.join(d, ent.name) })
      }
    }
  }
  const seen = new Set()
  return dirs.filter((s) => {
    if (seen.has(s.name)) return false
    seen.add(s.name)
    return true
  })
}

function parseSkillObservations(kingdomRoot) {
  const logPath = path.join(kingdomRoot, 'brain/skill-observations/log.md')
  if (!fs.existsSync(logPath)) return []
  const text = fs.readFileSync(logPath, 'utf8')
  const entries = []
  const blocks = text.split(/^## /m).slice(1)
  for (const block of blocks) {
    const nl = block.indexOf('\n')
    if (nl === -1) continue
    const header = block.slice(0, nl).trim()
    const body = block.slice(nl + 1).trim().slice(0, 400)
    entries.push({ header, body, at: header.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? null })
  }
  return entries.slice(0, 30)
}

export function syncSkillGraph(registry, kingdomRoot, dataDir, agents) {
  const skills = listSkillDirs()
  const observations = parseSkillObservations(kingdomRoot)

  const agentNodes = (agents ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    venture_id: a.ventureId,
    focus: a.focus,
    skills: AGENT_SKILL_MAP[a.id] ?? [],
    token_budget_usd: a.tokenBudgetUsd,
    token_used_usd: a.tokenUsedUsd,
    recent_observations: observations
      .filter(
        (o) =>
          o.body.toLowerCase().includes(a.name.toLowerCase()) ||
          o.body.toLowerCase().includes(a.ventureId.replace(/-/g, ' ')),
      )
      .slice(0, 3),
  }))

  const graph = {
    synced_at: new Date().toISOString(),
    skills: skills.map((s) => ({
      id: s.name,
      path: s.path,
      has_skill_md: fs.existsSync(path.join(s.path, 'SKILL.md')),
    })),
    agents: agentNodes,
  }

  fs.writeFileSync(
    path.join(dataDir, 'skill-graph.json'),
    JSON.stringify(graph, null, 2) + '\n',
  )
  console.log('Wrote skill-graph.json ·', skills.length, 'skills ·', agentNodes.length, 'agents')
}

export function rollupComicModels(_kingdomRoot, dataDir) {
  const comicPath = expandHome('~/Desktop/ComicMainEngine/data/usage.db')
  if (!fs.existsSync(comicPath)) return

  try {
    const raw = execFileSync(
      'sqlite3',
      [
        comicPath,
        "SELECT model, SUM(actual_usd) as spend, COUNT(*) as calls FROM api_call WHERE model IS NOT NULL GROUP BY model ORDER BY spend DESC LIMIT 15;",
      ],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    )
    const models = []
    for (const line of raw.trim().split('\n')) {
      if (!line) continue
      const [name, spend, calls] = line.split('|')
      models.push({
        name,
        spend_usd: Number(spend) || 0,
        calls: Number(calls) || 0,
        source: 'ComicMainEngine usage.db',
      })
    }
    const manifestPath = path.join(dataDir, 'manifests', 'comic-engine.json')
    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
      manifest.models_tested = models
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
    }
  } catch {
    /* sqlite3 unavailable */
  }
}
