import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { handleOrchestratorRequest } from './lib/orchestrator-handlers.mjs'
import { createEmbedProxyMiddleware } from './lib/embed-proxy.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq < 1) continue
    const key = t.slice(0, eq).trim()
    let val = t.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = val
  }
}

loadEnvFile(path.join(ROOT, '.env'))

export function orchestratorApiPlugin() {
  return {
    name: 'kingdom-orchestrator-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/api')) return next()
        void handleOrchestratorRequest(req, res).then((handled) => {
          if (!handled) next()
        })
      })
    },
  }
}

export function embedProxyPlugin() {
  const proxy = createEmbedProxyMiddleware()
  return {
    name: 'embed-proxy',
    configureServer(server) {
      server.middlewares.use(proxy)
    },
  }
}
