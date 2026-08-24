import fs from 'node:fs'
import path from 'node:path'
import { loadTrainingStatus } from './research-lab.mjs'

export function beamdojoRepoCandidates({ cwd, home } = {}) {
  const h = home ?? process.env.HOME ?? ''
  const c = cwd ?? process.cwd()
  return [
    '/agent/repos/beamdojo',
    path.join(h, 'Projects/BeamDojo'),
    path.resolve(c, '..', 'beamdojo'),
    path.resolve(c, '..', 'BeamDojo'),
  ]
}

/** Live gitignored JSON only — not the checked-in idle example. */
export function readLiveTrainingStatus(opts = {}) {
  const roots = opts.roots ?? beamdojoRepoCandidates(opts)
  for (const root of roots) {
    if (!root || !fs.existsSync(root)) continue
    const livePath = path.join(root, 'tracking', 'training-status.json')
    if (!fs.existsSync(livePath)) continue
    const training = loadTrainingStatus(root)
    if (training) return { training, repoRoot: root, path: livePath }
  }
  return null
}
