import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export function expandHome(p) {
  if (!p) return p
  const home = process.env.HOME || ''
  return p.startsWith('~/') ? path.join(home, p.slice(2)) : p
}

export function loadDashboardServices(kingdomRoot) {
  const root = kingdomRoot ?? path.resolve(__dirname, '../..')
  const configPath = path.join(root, 'config/dashboard-services.json')
  const raw = JSON.parse(fs.readFileSync(configPath, 'utf8'))
  const services = {}
  for (const [name, svc] of Object.entries(raw.services ?? {})) {
    services[name] = {
      ...svc,
      name,
      workdir: expandHome(svc.workdir),
      url: `http://127.0.0.1:${svc.port}`,
    }
  }
  return { version: raw.version, services }
}

export function serviceByVentureId(servicesMap, ventureId) {
  return Object.values(servicesMap).find((s) => s.ventureId === ventureId) ?? null
}

export function serviceByName(servicesMap, name) {
  return servicesMap[name] ?? null
}
