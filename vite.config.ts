import type { IncomingMessage, ServerResponse } from 'node:http'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
// @ts-expect-error ESM plugin module without types
import { embedProxyPlugin, orchestratorApiPlugin } from './scripts/vite-plugins.mjs'
// @ts-expect-error ESM module without types
import { readLiveTrainingStatus } from './scripts/lib/live-training.mjs'

function sendLiveStatus(req: IncomingMessage, res: ServerResponse, next: () => void) {
  const url = req.url?.split('?')[0]
  if (url !== '/live/training-status.json') {
    next()
    return
  }
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store')
  const got = readLiveTrainingStatus()
  if (!got?.training) {
    res.statusCode = 404
    res.end('{"status":null}\n')
    return
  }
  res.end(`${JSON.stringify(got.training)}\n`)
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
  plugins: [react(), orchestratorApiPlugin(), embedProxyPlugin(), liveTrainingStatusPlugin()],
  server: {
    port: 5173,
    strictPort: true,
    host: process.env.KINGDOM_SHARE ? '0.0.0.0' : '127.0.0.1',
    allowedHosts: true,
    hmr: process.env.KINGDOM_SHARE ? false : undefined,
  },
})
