import fs from 'node:fs'
import path from 'node:path'

export function expandHome(p) {
  if (!p) return null
  const home = process.env.HOME || ''
  return p.startsWith('~/') ? path.join(home, p.slice(2)) : p
}

export function loadRegistry(kingdomRoot) {
  const p = path.join(kingdomRoot, 'config', 'venture-registry.json')
  if (!fs.existsSync(p)) return { version: '0', ventures: [] }
  return JSON.parse(fs.readFileSync(p, 'utf8'))
}

/** Empty-but-real schema for plugging a future venture into brain + Throne. */
export function loadVentureTemplate(kingdomRoot) {
  const p = path.join(kingdomRoot, 'config', 'venture-template.json')
  if (!fs.existsSync(p)) return null
  return JSON.parse(fs.readFileSync(p, 'utf8'))
}

export function ventureTemplatePath(kingdomRoot) {
  return path.join(kingdomRoot, 'config', 'venture-template.json')
}

export function getRegistryEntry(registry, id) {
  return registry.ventures?.find((v) => v.id === id) ?? null
}

/** Cloud / workspace clones when the Mac path is absent. */
const BEAMDOJO_FALLBACKS = [
  '/agent/repos/beamdojo',
  path.resolve(process.cwd(), '..', 'beamdojo'),
]

export function resolveRepoPath(entry) {
  const primary = expandHome(entry?.repoPath)
  if (primary && fs.existsSync(primary)) return primary
  if (entry?.id === 'beamdojo') {
    for (const candidate of BEAMDOJO_FALLBACKS) {
      if (candidate && fs.existsSync(candidate)) return candidate
    }
  }
  return primary
}
