import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const GRAPHQL_URL = 'https://api.wandb.ai/graphql'
const DEFAULT_MAX_AGE_MS = 10 * 60 * 1000
const CACHE_TTL_MS = 5000

const RUNS_QUERY = `query BeamDojoRuns($entity: String!, $project: String!) {
  project(name: $project, entityName: $entity) {
    runs(first: 10, order: "-heartbeat_at") {
      edges { node { name displayName state heartbeatAt } }
    }
  }
}`

const VIEWER_QUERY = `{ viewer { entity } }`

let cache = { at: 0, value: undefined }

export function resetWandbLiveCache() {
  cache = { at: 0, value: undefined }
}

export function defaultLambdaEnvPaths({ cwd, home } = {}) {
  const h = home ?? process.env.HOME ?? os.homedir() ?? ''
  const c = cwd ?? process.cwd()
  return [
    path.resolve(c, '..', 'beamdojo', '.env.lambda'),
    path.resolve(c, '..', 'BeamDojo', '.env.lambda'),
    '/agent/repos/beamdojo/.env.lambda',
    path.join(h, 'Projects/BeamDojo/.env.lambda'),
  ]
}

/** Parse KEY=value files. Never logs values. */
export function readEnvFiles(paths) {
  const out = {}
  for (const file of paths ?? []) {
    if (!file || !fs.existsSync(file)) continue
    let text = ''
    try {
      text = fs.readFileSync(file, 'utf8')
    } catch {
      continue
    }
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const body = trimmed.startsWith('export ') ? trimmed.slice(7).trim() : trimmed
      const eq = body.indexOf('=')
      if (eq < 1) continue
      const key = body.slice(0, eq).trim()
      let value = body.slice(eq + 1).trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      if (key) out[key] = value
    }
  }
  return out
}

export function wandbSecretsFromDisk({ env = process.env, paths, cwd, home } = {}) {
  const file = readEnvFiles(paths ?? defaultLambdaEnvPaths({ cwd, home }))
  return {
    apiKey: String(env.WANDB_API_KEY || file.WANDB_API_KEY || '').trim(),
    entity: String(
      env.WANDB_ENTITY || env.WANDB_USERNAME || file.WANDB_ENTITY || file.WANDB_USERNAME || '',
    ).trim(),
    project: String(env.WANDB_PROJECT || file.WANDB_PROJECT || 'beamdojo').trim() || 'beamdojo',
  }
}

export function wandbRunUrl(entity, project, name) {
  if (!entity || !project || !name) return null
  return `https://wandb.ai/${entity}/${project}/runs/${name}`
}

export function isFreshRunningWandb(run, now = Date.now(), maxAgeMs = DEFAULT_MAX_AGE_MS) {
  if (!run || String(run.state || '').toLowerCase() !== 'running') return false
  if (!run.heartbeatAt) return false
  const t = Date.parse(run.heartbeatAt)
  if (Number.isNaN(t)) return false
  return now - t <= maxAgeMs
}

export function mergeFileAndWandb(fileStatus, wandbRun, { now = Date.now() } = {}) {
  const file = fileStatus && typeof fileStatus === 'object' ? { ...fileStatus } : null
  const wandbRunning = isFreshRunningWandb(wandbRun, now)

  if (file?.status === 'running') {
    if (wandbRunning && file.wandb_url && !String(file.wandb_url).includes('/runs/')) {
      return {
        ...file,
        wandb_url: wandbRun.url,
        wandb_entity: wandbRun.entity ?? file.wandb_entity,
        wandb_project: wandbRun.project ?? file.wandb_project,
      }
    }
    return file
  }

  const fileUpdated = file?.updated ? Date.parse(file.updated) : Number.NaN
  const beat = wandbRun?.heartbeatAt ? Date.parse(wandbRun.heartbeatAt) : Number.NaN
  if (
    file?.status === 'idle' &&
    Number.isFinite(fileUpdated) &&
    Number.isFinite(beat) &&
    fileUpdated >= beat
  ) {
    return file
  }

  if (wandbRunning) {
    return {
      ...(file || {}),
      status: 'running',
      wandb_url: wandbRun.url,
      wandb_entity: wandbRun.entity ?? file?.wandb_entity ?? null,
      wandb_project: wandbRun.project ?? file?.wandb_project ?? 'beamdojo',
      source: 'wandb',
      logger: file?.logger || 'wandb',
      updated: wandbRun.heartbeatAt || new Date(now).toISOString(),
      note:
        'Live W&B run (fresh heartbeat). Open Weights & Biases for curves. Local JSON was idle or missing.',
    }
  }
  return file
}

async function graphql(fetchImpl, apiKey, query, variables, graphqlUrl) {
  const res = await fetchImpl(graphqlUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ query, variables }),
  })
  if (!res.ok) return null
  const json = await res.json()
  if (json?.errors) return null
  return json?.data ?? null
}

async function wandbViewerEntity({ apiKey, fetchImpl, graphqlUrl }) {
  const data = await graphql(fetchImpl, apiKey, VIEWER_QUERY, {}, graphqlUrl)
  const entity = String(data?.viewer?.entity || '').trim()
  return entity || null
}

export async function fetchFreshWandbRunUncached({
  apiKey,
  entity,
  project = 'beamdojo',
  fetchImpl = globalThis.fetch,
  now = Date.now(),
  maxAgeMs = DEFAULT_MAX_AGE_MS,
  graphqlUrl = GRAPHQL_URL,
} = {}) {
  if (!apiKey || typeof fetchImpl !== 'function') return null
  try {
    let ent = String(entity || '').trim()
    if (!ent) {
      ent = (await wandbViewerEntity({ apiKey, fetchImpl, graphqlUrl })) || ''
    }
    if (!ent) return null
    const data = await graphql(fetchImpl, apiKey, RUNS_QUERY, { entity: ent, project }, graphqlUrl)
    const edges = data?.project?.runs?.edges
    if (!Array.isArray(edges)) return null
    for (const edge of edges) {
      const node = edge?.node
      if (!node) continue
      const run = {
        name: node.name,
        displayName: node.displayName,
        state: node.state,
        heartbeatAt: node.heartbeatAt,
        entity: ent,
        project,
        url: wandbRunUrl(ent, project, node.name),
      }
      if (isFreshRunningWandb(run, now, maxAgeMs)) return run
    }
    return null
  } catch {
    return null
  }
}

export async function fetchFreshWandbRun(opts = {}) {
  const now = opts.now ?? Date.now()
  if (!opts.skipCache && cache.value !== undefined && now - cache.at < CACHE_TTL_MS) {
    return cache.value
  }
  const value = await fetchFreshWandbRunUncached(opts)
  cache = { at: now, value }
  return value
}
