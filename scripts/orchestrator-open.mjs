#!/usr/bin/env node
/**
 * Open Kingdom orchestrator with deep-link query params.
 * Usage: node scripts/orchestrator-open.mjs [--venture id] [--tab tech] [--port 5173]
 */
import { execFileSync } from 'node:child_process'

const args = process.argv.slice(2)
let venture = null
let tab = 'run'
let port = 5173

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--venture' && args[i + 1]) venture = args[++i]
  else if (args[i] === '--tab' && args[i + 1]) tab = args[++i]
  else if (args[i] === '--port' && args[i + 1]) port = Number(args[++i])
}

const params = new URLSearchParams()
if (venture) params.set('venture', venture)
if (tab && tab !== 'run') params.set('tab', tab)
const qs = params.toString()
const url = `http://127.0.0.1:${port}/${qs ? `?${qs}` : ''}`

try {
  execFileSync('open', [url])
  console.log('Opened', url)
} catch (e) {
  console.error('Failed to open URL:', e.message)
  console.log(url)
  process.exit(1)
}
