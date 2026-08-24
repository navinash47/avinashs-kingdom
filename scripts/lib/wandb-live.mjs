import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const GRAPHQL_URL = 'https://api.wandb.ai/graphql'
const DEFAULT_MAX_AGE_MS = 10 * 60 * 1000
const CACHE_TTL_MS = 5000
const HISTORY_CAP = 120

const RUNS_QUERY = `query BeamDojoRuns($entity: String!, $project: String!) {
  project(name: $project, entityName: $entity) {
    runs(first: 10, order: "-heartbeat_at") {
      edges { node { name displayName state heartbeatAt summaryMetrics } }
    }
  }
}`

const HISTORY_QUERY = `query BeamDojoRunHistory($entity: String!, $project: String!, $name: String!) {
  project(name: $project, entityName: $entity) {
    run(name: $name) {
      sampledHistory(keys: ["Train/mean_reward", "_step"], samples: 120)
    }
  }
}`

const SUMMARY_KEY_ALIASES = {
  mean_reward: ['Train/mean_reward', 'train/mean_reward', 'mean_reward'],
  mean_episode_length: ['Train/mean_episode_length', 'train/mean_episode_length', 'mean_episode_length'],
  value_loss: ['Loss/value_function', 'loss/value_function', 'value_loss'],
  surrogate_loss: ['Loss/surrogate', 'loss/surrogate', 'surrogate_loss'],
  entropy: ['Loss/entropy', 'loss/entropy', 'entropy'],
  foothold_value_loss: [
    'Loss/value_foothold',
    'loss/value_foothold',
    'Loss/foothold_value_function',
    'loss/foothold_value_function',
    'foothold_value_loss',
  ],
  foothold_penalty: [
    'Episode/foothold_penalty',
    'Episode/Episode_Reward/foothold_penalty',
    'Episode_Reward/foothold_penalty',
    'foothold_penalty',
  ],
  fps: ['Perf/total_fps', 'perf/total_fps', 'fps'],
  iteration: ['_step', 'trainer/global_step', 'Train/iteration', 'iteration'],
}

function pickNumber(obj, names) {
  for (const name of names) {
    if (obj[name] == null || obj[name] === '') continue
    const n = Number(obj[name])
    if (Number.isFinite(n)) return n
  }
  return undefined
}

export function parseWandbSummary(raw) {
  let obj = raw
  if (typeof raw === 'string') {
    try {
      obj = JSON.parse(raw)
    } catch {
      return {}
    }
  }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return {}
  const out = {}
  for (const [dest, names] of Object.entries(SUMMARY_KEY_ALIASES)) {
    const n = pickNumber(obj, names)
    if (n != null) out[dest] = n
  }
  return out
}

export function parseWandbSampledHistory(raw) {
  if (!Array.isArray(raw)) return []
  const points = []
  for (const sample of raw) {
    const merged = {}
    const parts = Array.isArray(sample) ? sample : [sample]
    for (const part of parts) {
      let obj = part
      if (typeof part === 'string') {
        try {
          obj = JSON.parse(part)
        } catch {
          continue
        }
      }
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) Object.assign(merged, obj)
    }
    const iteration = pickNumber(merged, ['_step', 'iteration'])
    const mean_reward = pickNumber(merged, ['Train/mean_reward', 'mean_reward'])
    if (iteration == null || mean_reward == null) continue
    points.push({ iteration, mean_reward })
  }
  return points.slice(-HISTORY_CAP)
}

function wandbMetrics(wandbRun) {
  if (!wandbRun || typeof wandbRun !== 'object') return { metrics: {}, history: [] }
  const metrics =
    wandbRun.metrics && typeof wandbRun.metrics === 'object' && !Array.isArray(wandbRun.metrics)
      ? wandbRun.metrics
      : parseWandbSummary(wandbRun.summaryMetrics)
  const history = Array.isArray(wandbRun.history)
    ? wandbRun.history
    : parseWandbSampledHistory(wandbRun.sampledHistory)
  return { metrics, history }
}

function withWandbMetrics(base, wandbRun) {
  const { metrics, history } = wandbMetrics(wandbRun)
  const next = { ...(base || {}) }
  for (const [key, value] of Object.entries(metrics || {})) {
    if (value == null) continue
    if (next[key] == null) next[key] = value
  }
  if ((!Array.isArray(next.history) || next.history.length === 0) && history.length) {
    next.history = history
  }
  return next
}

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
    let running = file
    if (wandbRunning && file.wandb_url && !String(file.wandb_url).includes('/runs/')) {
      running = {
        ...file,
        wandb_url: wandbRun.url,
        wandb_entity: wandbRun.entity ?? file.wandb_entity,
        wandb_project: wandbRun.project ?? file.wandb_project,
      }
    }
    return wandbRunning ? withWandbMetrics(running, wandbRun) : running
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
    return withWandbMetrics(
      {
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
      },
      wandbRun,
    )
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
        summaryMetrics: node.summaryMetrics,
        metrics: parseWandbSummary(node.summaryMetrics),
        entity: ent,
        project,
        url: wandbRunUrl(ent, project, node.name),
      }
      if (!isFreshRunningWandb(run, now, maxAgeMs)) continue
      try {
        const hist = await graphql(
          fetchImpl,
          apiKey,
          HISTORY_QUERY,
          { entity: ent, project, name: node.name },
          graphqlUrl,
        )
        run.sampledHistory = hist?.project?.run?.sampledHistory
        run.history = parseWandbSampledHistory(run.sampledHistory)
      } catch {
        run.history = []
      }
      return run
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
