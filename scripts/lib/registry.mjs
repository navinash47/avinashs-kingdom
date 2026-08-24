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

export function getRegistryEntry(registry, id) {
  return registry.ventures?.find((v) => v.id === id) ?? null
}

export function resolveRepoPath(entry) {
  return expandHome(entry?.repoPath)
}
