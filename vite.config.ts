import fs from 'node:fs'
import path from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

function liveStatusFile(): string | null {
  const home = process.env.HOME ?? ''
  const candidates = [
    path.resolve(process.cwd(), '..', 'beamdojo', 'tracking', 'training-status.json'),
    '/agent/repos/beamdojo/tracking/training-status.json',
    path.join(home, 'Projects/BeamDojo/tracking/training-status.json'),
  ]
  return candidates.find((p) => fs.existsSync(p)) ?? null
}

function sendLiveStatus(_req: IncomingMessage, res: ServerResponse, next: () => void) {
  const url = _req.url?.split('?')[0]
  if (url !== '/live/training-status.json') {
    next()
    return
  }
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store')
  const file = liveStatusFile()
  if (!file) {
    res.statusCode = 404
    res.end('{"status":null}\n')
    return
  }
  try {
    res.end(fs.readFileSync(file, 'utf8'))
  } catch {
    res.statusCode = 404
    res.end('{"status":null}\n')
  }
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
