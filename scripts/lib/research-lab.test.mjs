import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, it } from 'node:test'
import {
  loadTrainingStatus,
  normalizeTrainingStatus,
  showLiveTrainingCard,
  wandbUrlFromStatus,
} from './research-lab.mjs'
import { resolveRepoPath } from './registry.mjs'

const tmpDirs = []

function scratch() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kingdom-training-'))
  tmpDirs.push(dir)
  return dir
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

describe('wandbUrlFromStatus', () => {
  it('builds entity/project URL when wandb_entity is set', () => {
    const link = wandbUrlFromStatus({
      wandb_entity: 'avinash',
      wandb_project: 'beamdojo',
    })
    assert.equal(link.href, 'https://wandb.ai/avinash/beamdojo')
    assert.equal(link.needsProjectHint, false)
    assert.equal(link.project, 'beamdojo')
  })

  it('opens wandb.ai and hints at project beamdojo when entity is missing', () => {
    const link = wandbUrlFromStatus({
      wandb_entity: null,
      wandb_project: 'beamdojo',
      wandb_url: 'https://wandb.ai',
    })
    assert.equal(link.href, 'https://wandb.ai')
    assert.equal(link.needsProjectHint, true)
    assert.equal(link.project, 'beamdojo')
  })

  it('keeps a specific wandb_url (does not invent a run URL)', () => {
    const link = wandbUrlFromStatus({
      wandb_entity: null,
      wandb_project: 'beamdojo',
      wandb_url: 'https://wandb.ai/someone/beamdojo',
    })
    assert.equal(link.href, 'https://wandb.ai/someone/beamdojo')
    assert.equal(link.needsProjectHint, false)
  })

  it('keeps a live run URL from the GPU writer', () => {
    const link = wandbUrlFromStatus({
      wandb_project: 'beamdojo',
      wandb_url: 'https://wandb.ai/avinash/beamdojo/runs/abc123',
    })
    assert.equal(link.href, 'https://wandb.ai/avinash/beamdojo/runs/abc123')
    assert.equal(link.needsProjectHint, false)
  })
})

describe('loadTrainingStatus', () => {
  it('returns null when the live file and example are missing', () => {
    const dir = scratch()
    assert.equal(loadTrainingStatus(dir), null)
    assert.equal(loadTrainingStatus(null), null)
  })

  it('attaches valid live JSON and keeps idle (does not fake running)', () => {
    const dir = scratch()
    fs.mkdirSync(path.join(dir, 'tracking'))
    fs.writeFileSync(
      path.join(dir, 'tracking/training-status.json'),
      JSON.stringify({
        updated: '2026-08-24T19:00:00Z',
        status: 'idle',
        host: 'lambda-a10',
        robot: 'h1',
        stage: 1,
        num_envs: 1024,
        max_iterations: 10000,
        iteration: null,
        logger: 'wandb',
        wandb_project: 'beamdojo',
        wandb_entity: null,
        wandb_url: 'https://wandb.ai',
        log_dir: null,
        checkpoint: null,
        note: 'No long train running.',
      }),
    )
    const training = loadTrainingStatus(dir)
    assert.equal(training.status, 'idle')
    assert.equal(training.robot, 'h1')
    assert.equal(training.iteration, null)
    assert.equal(training.wandb_url, 'https://wandb.ai')
    assert.equal(training.source, 'live')
    assert.notEqual(training.status, 'running')
  })

  it('loads the example snapshot when live JSON is absent', () => {
    const dir = scratch()
    fs.mkdirSync(path.join(dir, 'tracking'))
    fs.writeFileSync(
      path.join(dir, 'tracking/training-status.example.json'),
      JSON.stringify({
        status: 'idle',
        wandb_project: 'beamdojo',
        wandb_entity: 'lab',
        note: 'Checked-in idle example.',
      }),
    )
    const training = loadTrainingStatus(dir)
    assert.equal(training.status, 'idle')
    assert.equal(training.source, 'example')
    assert.equal(training.wandb_url, 'https://wandb.ai/lab/beamdojo')
  })

  it('prefers live JSON over the example file', () => {
    const dir = scratch()
    fs.mkdirSync(path.join(dir, 'tracking'))
    fs.writeFileSync(
      path.join(dir, 'tracking/training-status.example.json'),
      JSON.stringify({ status: 'idle', note: 'example' }),
    )
    fs.writeFileSync(
      path.join(dir, 'tracking/training-status.json'),
      JSON.stringify({ status: 'idle', note: 'live heartbeat', wandb_entity: 'gpu' }),
    )
    const training = loadTrainingStatus(dir)
    assert.equal(training.source, 'live')
    assert.equal(training.note, 'live heartbeat')
    assert.equal(training.wandb_url, 'https://wandb.ai/gpu/beamdojo')
  })

  it('coerces invalid status to unknown', () => {
    const got = normalizeTrainingStatus({ status: 'training', wandb_project: 'beamdojo' })
    assert.equal(got.status, 'unknown')
  })
})

describe('showLiveTrainingCard', () => {
  it('always shows for beamdojo even without a status snapshot', () => {
    assert.equal(showLiveTrainingCard({ id: 'beamdojo', training: null }), true)
  })

  it('hides other research projects when training is null', () => {
    assert.equal(showLiveTrainingCard({ id: 'research-frontier', training: null }), false)
  })

  it('shows other projects when a status object exists', () => {
    assert.equal(
      showLiveTrainingCard({ id: 'research-frontier', training: { status: 'idle' } }),
      true,
    )
  })
})

describe('resolveRepoPath beamdojo fallback', () => {
  it('uses the primary path when it exists', () => {
    const dir = scratch()
    const resolved = resolveRepoPath({ id: 'beamdojo', repoPath: dir })
    assert.equal(resolved, dir)
  })
})
