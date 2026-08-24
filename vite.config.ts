import fs from 'node:fs'
import path from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import {
  fetchFreshWandbRun,
  mergeFileAndWandb,
  wandbSecretsFromDisk,
  entityForWandbFetch,
} from './scripts/lib/wandb-live.mjs'
import { normalizeTrainingStatus } from './scripts/lib/research-lab.mjs'

function liveStatusFile(): string | null {
  const home = process.env.HOME ?? ''
  const candidates = [
    path.resolve(process.cwd(), '..', 'beamdojo', 'tracking', 'training-status.json'),
    path.resolve(process.cwd(), '..', 'BeamDojo', 'tracking', 'training-status.json'),
    '/agent/repos/beamdojo/tracking/training-status.json',
    path.join(home, 'Projects/BeamDojo/tracking/training-status.json'),
    path.join(home, 'Projects/BeamDojo/logs/training-status.json'),
    '/lambda/nfs/beamdojo/logs/training-status.json',
  ]
  return candidates.find((p) => fs.existsSync(p)) ?? null
}

function readLocalStatus(): Record<string, unknown> | null {
  const file = liveStatusFile()
  if (!file) return null
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as unknown
    return raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null
  } catch {
    return null
  }
}

async function resolveLivePayload(): Promise<Record<string, unknown> | null> {
  const fileStatus = readLocalStatus()
  const secrets = wandbSecretsFromDisk()
  const wandb = secrets.apiKey
    ? await fetchFreshWandbRun({
        apiKey: secrets.apiKey,
        entity: entityForWandbFetch(secrets, fileStatus),
        project: secrets.project,
      })
    : null
  const merged = mergeFileAndWandb(fileStatus, wandb)
  if (!merged) return null
  const source = typeof merged.source === 'string' ? merged.source : 'live'
  return normalizeTrainingStatus(merged, { source }) as Record<string, unknown> | null
}

function sendLiveStatus(_req: IncomingMessage, res: ServerResponse, next: () => void) {
  const url = _req.url?.split('?')[0]
  if (url !== '/live/training-status.json') {
    next()
    return
  }
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store')
  void resolveLivePayload()
    .then((body) => {
      if (res.writableEnded) return
      if (!body) {
        res.statusCode = 404
        res.end('{"status":null}\n')
        return
      }
      res.end(`${JSON.stringify(body)}\n`)
    })
    .catch(() => {
      if (res.writableEnded) return
      res.statusCode = 404
      res.end('{"status":null}\n')
    })
}

function liveTrainingStatusPlugin(): Plugin {
  return {
    name: 'live-training-status',
    configureServer(server) {
      server.middlewares.use(sendLiveStatus)
    },
    configurePreviewServer(server) {
      server.middlewares.use(sendLiveStatus)
    },
  }
}

export default defineConfig({
  plugins: [react(), liveTrainingStatusPlugin()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    allowedHosts: ['.trycloudflare.com', 'localhost', '127.0.0.1'],
  },
})
