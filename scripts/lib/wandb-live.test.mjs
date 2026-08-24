import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, it } from 'node:test'
import {
  fetchFreshWandbRunUncached,
  isFreshRunningWandb,
  mergeFileAndWandb,
  readEnvFiles,
  resetWandbLiveCache,
  wandbRunUrl,
  wandbSecretsFromDisk,
} from './wandb-live.mjs'

const tmpDirs = []

afterEach(() => {
  resetWandbLiveCache()
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

describe('wandbRunUrl', () => {
  it('builds a run URL', () => {
    assert.equal(wandbRunUrl('lab', 'beamdojo', 'abc'), 'https://wandb.ai/lab/beamdojo/runs/abc')
  })
})

describe('readEnvFiles / wandbSecretsFromDisk', () => {
  it('reads .env.lambda without requiring process env', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kingdom-wandb-'))
    tmpDirs.push(dir)
    const envPath = path.join(dir, '.env.lambda')
    fs.writeFileSync(envPath, 'WANDB_API_KEY=secret-test-key\nWANDB_ENTITY=lab\nWANDB_PROJECT=beamdojo\n')
    const secrets = wandbSecretsFromDisk({ env: {}, paths: [envPath] })
    assert.equal(secrets.apiKey, 'secret-test-key')
    assert.equal(secrets.entity, 'lab')
    assert.equal(secrets.project, 'beamdojo')
    assert.equal(readEnvFiles([envPath]).WANDB_API_KEY, 'secret-test-key')
  })
})

describe('isFreshRunningWandb', () => {
  it('rejects finished and stale running', () => {
    const now = Date.parse('2026-08-24T21:00:00Z')
    assert.equal(isFreshRunningWandb({ state: 'finished', heartbeatAt: '2026-08-24T20:59:00Z' }, now), false)
    assert.equal(
      isFreshRunningWandb({ state: 'running', heartbeatAt: '2026-08-24T20:00:00Z' }, now),
      false,
    )
    assert.equal(
      isFreshRunningWandb({ state: 'running', heartbeatAt: '2026-08-24T20:55:00Z' }, now),
      true,
    )
    assert.equal(isFreshRunningWandb({ state: 'running' }, now), false)
  })
})

describe('mergeFileAndWandb', () => {
  const now = Date.parse('2026-08-24T21:00:00Z')
  const liveRun = {
    state: 'running',
    heartbeatAt: '2026-08-24T20:58:00Z',
    entity: 'lab',
    project: 'beamdojo',
    name: 'abc',
    url: 'https://wandb.ai/lab/beamdojo/runs/abc',
  }

  it('does not fake running from a finished W&B run', () => {
    const merged = mergeFileAndWandb(
      { status: 'idle', wandb_url: 'https://wandb.ai' },
      { ...liveRun, state: 'finished' },
      { now },
    )
    assert.equal(merged.status, 'idle')
  })

  it('overlays a fresh W&B run when local JSON is missing', () => {
    const merged = mergeFileAndWandb(null, liveRun, { now })
    assert.equal(merged?.status, 'running')
    assert.equal(merged?.source, 'wandb')
    assert.equal(merged?.wandb_url, liveRun.url)
  })

  it('overlays a fresh W&B run onto idle local JSON', () => {
    const merged = mergeFileAndWandb({ status: 'idle', host: 'local' }, liveRun, { now })
    assert.equal(merged.status, 'running')
    assert.equal(merged.source, 'wandb')
    assert.equal(merged.wandb_url, liveRun.url)
    assert.equal(merged.host, 'local')
  })

  it('keeps a newer local idle (mark_idle after terminate) over a W&B heartbeat', () => {
    const merged = mergeFileAndWandb(
      { status: 'idle', updated: '2026-08-24T20:59:00Z', note: 'A10 terminating' },
      liveRun,
      { now },
    )
    assert.equal(merged.status, 'idle')
    assert.equal(merged.note, 'A10 terminating')
  })

  it('keeps local running and fills a missing run URL', () => {
    const merged = mergeFileAndWandb(
      { status: 'running', wandb_url: 'https://wandb.ai', iteration: 12 },
      liveRun,
      { now },
    )
    assert.equal(merged.status, 'running')
    assert.equal(merged.iteration, 12)
    assert.equal(merged.wandb_url, liveRun.url)
  })
})

describe('fetchFreshWandbRunUncached', () => {
  it('returns the first fresh running run from GraphQL', async () => {
    const now = Date.parse('2026-08-24T21:00:00Z')
    const fetchImpl = async (_url, init) => {
      const body = JSON.parse(init.body)
      if (String(body.query).includes('viewer')) {
        return {
          ok: true,
          json: async () => ({ data: { viewer: { entity: 'lab' } } }),
        }
      }
      return {
        ok: true,
        json: async () => ({
          data: {
            project: {
              runs: {
                edges: [
                  {
                    node: {
                      name: 'old',
                      state: 'finished',
                      heartbeatAt: '2026-08-24T20:59:00Z',
                    },
                  },
                  {
                    node: {
                      name: 'live1',
                      state: 'running',
                      heartbeatAt: '2026-08-24T20:58:00Z',
                    },
                  },
                ],
              },
            },
          },
        }),
      }
    }
    const run = await fetchFreshWandbRunUncached({
      apiKey: 'k',
      entity: '',
      project: 'beamdojo',
      fetchImpl,
      now,
    })
    assert.equal(run.url, 'https://wandb.ai/lab/beamdojo/runs/live1')
    assert.equal(run.state, 'running')
  })

  it('returns null without an API key (does not invent a run)', async () => {
    const run = await fetchFreshWandbRunUncached({ apiKey: '', fetchImpl: async () => {
      throw new Error('should not fetch')
    } })
    assert.equal(run, null)
  })
})
