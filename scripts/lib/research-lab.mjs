import fs from 'node:fs'
import path from 'node:path'
import { resolveRepoPath } from './registry.mjs'

export const DEFAULT_WANDB_PROJECT = 'beamdojo'
export const DEFAULT_TRAINING_STATUS_REL = 'tracking/training-status.json'
const ALLOWED_STATUS = new Set(['idle', 'running', 'unknown'])

/** Research Lab: BeamDojo always, others only when sync found a status file. */
export function showLiveTrainingCard(project) {
  if (!project || typeof project !== 'object') return false
  if (project.id === 'beamdojo') return true
  return project.training != null
}

export function wandbUrlFromStatus(training) {
  const project = String(training?.wandb_project || DEFAULT_WANDB_PROJECT)
  const entity = String(training?.wandb_entity || '').trim()
  const explicit = String(training?.wandb_url || '').trim()
  const specific =
    explicit &&
    explicit !== 'https://wandb.ai' &&
    explicit !== 'https://wandb.ai/'
  if (specific) {
    const hasProjectPath = /wandb\.ai\/[^/]+\/[^/]+/.test(explicit)
    return {
      href: explicit,
      project,
      needsProjectHint: !entity && !hasProjectPath,
    }
  }
  if (entity) {
    return {
      href: `https://wandb.ai/${entity}/${project}`,
      project,
      needsProjectHint: false,
    }
  }
  return { href: 'https://wandb.ai', project, needsProjectHint: true }
}

export function normalizeTrainingStatus(raw, { source = 'live' } = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const status = ALLOWED_STATUS.has(raw.status) ? raw.status : 'unknown'
  const safeStatus = source === 'example' && status === 'running' ? 'unknown' : status
  const link = wandbUrlFromStatus({ ...raw, status: safeStatus })
  return {
    updated: raw.updated ?? null,
    status: safeStatus,
    host: raw.host ?? null,
    robot: raw.robot ?? null,
    stage: raw.stage ?? null,
    num_envs: raw.num_envs ?? null,
    max_iterations: raw.max_iterations ?? null,
    iteration: raw.iteration ?? null,
    logger: raw.logger ?? null,
    wandb_project: raw.wandb_project || DEFAULT_WANDB_PROJECT,
    wandb_entity: raw.wandb_entity ?? null,
    wandb_url: link.href,
    log_dir: raw.log_dir ?? null,
    checkpoint: raw.checkpoint ?? null,
    note: raw.note ?? null,
    source,
  }
}

export function loadLiveTrainingFile(repoRoot, relPath) {
  if (!repoRoot || !relPath) return null
  const livePath = path.join(repoRoot, relPath)
  if (!fs.existsSync(livePath)) return null
  try {
    const raw = JSON.parse(fs.readFileSync(livePath, 'utf8'))
    return normalizeTrainingStatus(raw, { source: 'live' })
  } catch {
    return normalizeTrainingStatus(
      {
        status: 'unknown',
        wandb_project: DEFAULT_WANDB_PROJECT,
        wandb_url: 'https://wandb.ai',
        note: `Could not parse ${path.basename(livePath)}`,
      },
      { source: 'live' },
    )
  }
}

export function loadTrainingStatus(repoRoot, relPath = DEFAULT_TRAINING_STATUS_REL) {
  if (!repoRoot) return null
  const livePath = path.join(repoRoot, relPath)
  const examplePath = path.join(path.dirname(livePath), 'training-status.example.json')
  const tryExample = () => {
    if (!fs.existsSync(examplePath)) return null
    try {
      const raw = JSON.parse(fs.readFileSync(examplePath, 'utf8'))
      return normalizeTrainingStatus(raw, { source: 'example' })
    } catch {
      return normalizeTrainingStatus(
        {
          status: 'unknown',
          wandb_project: DEFAULT_WANDB_PROJECT,
          wandb_url: 'https://wandb.ai',
          note: `Could not parse ${path.basename(examplePath)}`,
        },
        { source: 'example' },
      )
    }
  }
  return loadLiveTrainingFile(repoRoot, relPath) ?? tryExample()
}

/** Prefer gitignored live JSON in tracking/ or NFS logs/, then the example file. */
export function loadTrainingStatusFromRepo(repoRoot, preferredRel = DEFAULT_TRAINING_STATUS_REL) {
  if (!repoRoot) return null
  const rels = [preferredRel, 'tracking/training-status.json', 'logs/training-status.json']
  const seen = new Set()
  for (const rel of rels) {
    if (!rel || seen.has(rel)) continue
    seen.add(rel)
    const live = loadLiveTrainingFile(repoRoot, rel)
    if (live) return live
  }
  return loadTrainingStatus(repoRoot, preferredRel)
}

function jsonlSpend(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return { total: 0, rows: 0 }
  let total = 0
  let rows = 0
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    if (!line.trim()) continue
    try {
      const row = JSON.parse(line)
      const usd = Number(row.actual_usd ?? row.amount ?? 0)
      if (usd > 0) {
        total += usd
        rows += 1
      }
    } catch {
      /* skip bad line */
    }
  }
  return { total, rows }
}

function copyProofVideos(repoRoot, destDir, items) {
  fs.mkdirSync(destDir, { recursive: true })
  const copied = []
  for (const item of items) {
    const rel = item.video
    if (!rel || rel.startsWith('http') || rel.startsWith('/data/')) continue
    const src = path.resolve(repoRoot, rel)
    if (!fs.existsSync(src)) continue
    const name = path.basename(src)
    const dest = path.join(destDir, name)
    fs.copyFileSync(src, dest)
    item.video = `/data/research/${path.basename(destDir)}/${name}`
    copied.push(name)
  }
  for (const folder of ['proofs', 'videos', 'proofs']) {
    const dir = path.join(repoRoot, folder)
    if (!fs.existsSync(dir)) continue
    for (const name of fs.readdirSync(dir)) {
      if (!name.endsWith('.mp4')) continue
      const dest = path.join(destDir, name)
      if (!fs.existsSync(dest)) {
        fs.copyFileSync(path.join(dir, name), dest)
      }
      copied.push(name)
    }
  }
  return [...new Set(copied)]
}

export function syncResearchLab(registry, kingdomRoot, dataDir, ventures) {
  const outDir = path.join(dataDir, 'research')
  fs.mkdirSync(outDir, { recursive: true })
  const projects = []

  for (const entry of registry.ventures ?? []) {
    if (entry.kind !== 'research') continue
    const repoRoot = resolveRepoPath(entry)
    const venture = (ventures ?? []).find((v) => v.id === entry.id)
    const expPath = path.join(dataDir, 'experiments', `${entry.id}.json`)
    const archPath = path.join(dataDir, 'architecture', `${entry.id}.json`)
    const experiments = fs.existsSync(expPath)
      ? JSON.parse(fs.readFileSync(expPath, 'utf8'))
      : { items: [] }
    const architecture = fs.existsSync(archPath)
      ? JSON.parse(fs.readFileSync(archPath, 'utf8'))
      : null

    const items = Array.isArray(experiments.items) ? experiments.items : []
    const videos = repoRoot
      ? copyProofVideos(repoRoot, path.join(outDir, entry.id), items)
      : []
    if (fs.existsSync(expPath)) {
      fs.writeFileSync(expPath, JSON.stringify(experiments, null, 2) + '\n')
    }

    const expRel = entry.paths?.expenses
    const spend = jsonlSpend(expRel && repoRoot ? path.join(repoRoot, expRel) : null)
    const statusRel = entry.paths?.trainingStatus || DEFAULT_TRAINING_STATUS_REL
    const training = loadTrainingStatusFromRepo(repoRoot, statusRel)
    if (training) {
      const dest = path.join(outDir, entry.id)
      fs.mkdirSync(dest, { recursive: true })
      fs.writeFileSync(
        path.join(dest, 'training-status.json'),
        JSON.stringify(training, null, 2) + '\n',
      )
    }

    projects.push({
      id: entry.id,
      name: venture?.name ?? entry.id,
      field: entry.field ?? 'research',
      progress: venture?.progress ?? 0,
      version: venture?.version ?? null,
      priority: venture?.priority ?? null,
      nextMilestone: venture?.nextMilestone ?? null,
      repoPath: repoRoot,
      github: entry.github ?? null,
      spendUsd: Math.round(spend.total * 100) / 100,
      expenseRows: spend.rows,
      videos,
      experiments: items.slice(0, 12),
      architecture,
      training,
    })
  }

  const payload = {
    updated: new Date().toISOString(),
    projects,
  }
  fs.writeFileSync(
    path.join(dataDir, 'research-lab.json'),
    JSON.stringify(payload, null, 2) + '\n',
  )
  console.log('Wrote research-lab.json ·', projects.length, 'projects')
  return payload
}

export function researchExpenseRows(registry, today) {
  const rows = []
  for (const entry of registry.ventures ?? []) {
    if (entry.kind !== 'research') continue
    const rel = entry.paths?.expenses
    if (!rel) continue
    const repoRoot = resolveRepoPath(entry)
    if (!repoRoot) continue
    const filePath = path.join(repoRoot, rel)
    const spend = jsonlSpend(filePath)
    if (!spend.rows) continue
    rows.push({
      id: `sync-${entry.id}-gpu`,
      date: today,
      category: 'infra',
      label: `${entry.id} GPU / compute`,
      amount: Math.round(spend.total * 100) / 100,
      currency: 'USD',
      ventureId: entry.id,
      notes: `Synced from ${rel} · ${spend.rows} billable rows`,
    })
  }
  return rows
}
