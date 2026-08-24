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
    '/lambda/nfs/beamdojo',
  ]
}

export function liveStatusRelPaths() {
  return ['tracking/training-status.json', 'logs/training-status.json']
}

/** Live gitignored JSON only — not the checked-in idle example. */
export function readLiveTrainingStatus(opts = {}) {
  const roots = opts.roots ?? beamdojoRepoCandidates(opts)
  const rels = opts.rels ?? liveStatusRelPaths()
  for (const root of roots) {
    if (!root || !fs.existsSync(root)) continue
    for (const rel of rels) {
      const livePath = path.join(root, rel)
      if (!fs.existsSync(livePath)) continue
      const training = loadTrainingStatus(root, rel)
      if (training && training.source === 'live') return { training, repoRoot: root, path: livePath }
    }
  }
  return null
}
