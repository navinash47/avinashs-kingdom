import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

function portOpen(port) {
  try {
    execFileSync('nc', ['-z', '127.0.0.1', String(port)], {
      stdio: 'ignore',
    })
    return true
  } catch {
    return false
  }
}

export function checkServiceHealth(entry) {
  const services = []
  if (entry.dashboard?.port) {
    const up = portOpen(entry.dashboard.port)
    services.push({
      id: 'dashboard',
      label: entry.dashboard.label ?? 'Dashboard',
      port: entry.dashboard.port,
      url: `http://127.0.0.1:${entry.dashboard.port}`,
      status: up ? 'up' : 'down',
    })
  }
  return services
}

export function attachHealthToManifests(registry, dataDir) {
  const manifestsDir = path.join(dataDir, 'manifests')
  for (const entry of registry.ventures ?? []) {
    const manifestPath = path.join(manifestsDir, `${entry.id}.json`)
    if (!fs.existsSync(manifestPath)) continue
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    manifest.services = checkServiceHealth(entry)
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
  }
  console.log('Attached service health to manifests')
}
