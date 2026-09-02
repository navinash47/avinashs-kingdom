#!/usr/bin/env node
/**
 * Smoke every MCP-registered venture (read-only).
 * Usage: node mcp/smoke-fleet.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const kingdomRoot = path.join(__dirname, '..')
const mcpReg = JSON.parse(
  fs.readFileSync(path.join(kingdomRoot, 'config', 'mcp-registry.json'), 'utf8'),
)

const servers = mcpReg.servers || []
const results = []
let failed = 0

for (const s of servers) {
  const id = s.venture_id
  const r = spawnSync(
    process.execPath,
    [path.join(__dirname, 'venture-server.mjs'), '--smoke', id],
    {
      cwd: kingdomRoot,
      encoding: 'utf8',
      maxBuffer: 8 * 1024 * 1024,
      env: { ...process.env, KINGDOM_VENTURE_ID: id },
    },
  )
  let parsed = null
  try {
    parsed = JSON.parse(r.stdout || '{}')
  } catch {
    /* keep null */
  }
  const ok = r.status === 0 && parsed?.get_status?.ok === true
  if (!ok) failed++
  results.push({
    venture_id: id,
    ok,
    exit: r.status,
    progress: parsed?.get_status?.progress || null,
    phases: parsed?.get_phases?.note || (parsed?.get_phases?.phases ? 'present' : null),
    error: ok ? null : (parsed?.get_status?.error || r.stderr?.slice(0, 200) || 'smoke failed'),
  })
}

const summary = {
  ok: failed === 0,
  smoked: results.length,
  failed,
  skipped: mcpReg.skipped || [],
  results,
}
console.log(JSON.stringify(summary, null, 2))
process.exit(failed === 0 ? 0 : 1)
