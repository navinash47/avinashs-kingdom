#!/usr/bin/env node
/** CLI helper for start-dashboards.sh — reads config/dashboard-services.json */
import { loadDashboardServices } from './dashboard-services.mjs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')
const { services } = loadDashboardServices(ROOT)

const [cmd, arg] = process.argv.slice(2)

if (cmd === 'list') {
  for (const name of Object.keys(services)) console.log(name)
  process.exit(0)
}

if (cmd === 'get' && arg) {
  const svc = services[arg]
  if (!svc) process.exit(1)
  console.log(`${svc.port}|${svc.workdir}|${svc.cmd}`)
  process.exit(0)
}

if (cmd === 'all') {
  for (const [name, svc] of Object.entries(services)) {
    console.log(`${name}|${svc.port}|${svc.workdir}|${svc.cmd}`)
  }
  process.exit(0)
}

console.error('Usage: dashboard-services-cli.mjs {list|get <name>|all}')
process.exit(1)
