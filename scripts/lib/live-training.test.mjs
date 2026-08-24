import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, it } from 'node:test'
import { beamdojoRepoCandidates, readLiveTrainingStatus } from './live-training.mjs'

const tmpDirs = []

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

describe('readLiveTrainingStatus', () => {
  it('returns null when only the example file exists', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kingdom-live-'))
    tmpDirs.push(dir)
    fs.mkdirSync(path.join(dir, 'tracking'))
    fs.writeFileSync(
      path.join(dir, 'tracking/training-status.example.json'),
      JSON.stringify({ status: 'idle', wandb_project: 'beamdojo' }),
    )
    const got = readLiveTrainingStatus({ roots: [dir] })
    assert.equal(got, null)
  })

  it('reads gitignored live JSON from a candidate repo', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kingdom-live-'))
    tmpDirs.push(dir)
    const repo = path.join(dir, 'Projects', 'BeamDojo')
    fs.mkdirSync(path.join(repo, 'tracking'), { recursive: true })
    fs.writeFileSync(
      path.join(repo, 'tracking/training-status.json'),
      JSON.stringify({
        status: 'running',
        iteration: 40,
        wandb_project: 'beamdojo',
        wandb_url: 'https://wandb.ai/lab/beamdojo/runs/abc',
      }),
    )
    const got = readLiveTrainingStatus({ roots: [repo] })
    assert.equal(got.training.status, 'running')
    assert.equal(got.training.iteration, 40)
    assert.equal(got.training.wandb_url, 'https://wandb.ai/lab/beamdojo/runs/abc')
    assert.equal(got.training.source, 'live')
  })

  it('lists cloud and Mac clone paths', () => {
    const paths = beamdojoRepoCandidates({ cwd: '/tmp', home: '/home/avinash' })
    assert.ok(paths.includes('/agent/repos/beamdojo'))
    assert.ok(paths.some((p) => p.endsWith('Projects/BeamDojo')))
  })
})
