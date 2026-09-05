#!/usr/bin/env node
/** Standalone orchestrator API on :5174 — Mac bridge target for Vercel. */
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { handleOrchestratorRequest } from './lib/orchestrator-handlers.mjs'

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

const PORT = Number(process.env.ORCHESTRATOR_API_PORT || 5174)
const HOST = process.env.ORCHESTRATOR_API_HOST || '127.0.0.1'

const server = http.createServer(async (req, res) => {
  const handled = await handleOrchestratorRequest(req, res)
  if (!handled) {
    res.writeHead(404)
    res.end('Not found')
  }
})

server.listen(PORT, HOST, () => {
  const token = Boolean((process.env.KINGDOM_CONTROL_TOKEN ?? '').trim())
  console.log(`Kingdom orchestrator API → http://${HOST}:${PORT}`)
  console.log(`  health: http://${HOST}:${PORT}/api/health`)
  console.log(`  auth:   ${token ? 'KINGDOM_CONTROL_TOKEN required' : 'open (set KINGDOM_CONTROL_TOKEN)'}`)
})
