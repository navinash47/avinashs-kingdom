import fs from 'node:fs'
import path from 'node:path'
import { resolveRepoPath } from './registry.mjs'

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
  // Also copy any leftover mp4s in proofs/ so the lab is complete even if wiki omitted Video:
  const proofsDir = path.join(repoRoot, 'proofs')
  if (fs.existsSync(proofsDir)) {
    for (const name of fs.readdirSync(proofsDir)) {
      if (!name.endsWith('.mp4')) continue
      const dest = path.join(destDir, name)
      if (!fs.existsSync(dest)) {
        fs.copyFileSync(path.join(proofsDir, name), dest)
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
    const videos = copyProofVideos(
      repoRoot,
      path.join(outDir, entry.id),
      items,
    )
    if (fs.existsSync(expPath)) {
      fs.writeFileSync(expPath, JSON.stringify(experiments, null, 2) + '\n')
    }

    const expRel = entry.paths?.expenses
    const spend = jsonlSpend(expRel && repoRoot ? path.join(repoRoot, expRel) : null)

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
