#!/usr/bin/env node
/**
 * Kingdom venture MCP server (read-only Phase 2).
 *
 * Template + pilot: driven by KINGDOM_VENTURE_ID (default kingdom-ops) and
 * config/venture-registry.json. Never reads .env, secrets, or model weights.
 *
 * Tools: get_status, get_phases, list_capabilities
 *
 * Cursor MCP config example:
 *   "kingdom-ops": {
 *     "command": "node",
 *     "args": ["/Users/.../avinashs-kingdom/mcp/venture-server.mjs"],
 *     "env": { "KINGDOM_VENTURE_ID": "kingdom-ops" }
 *   }
 *
 * Smoke (no Cursor): node mcp/venture-server.mjs --smoke
 */
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import readline from 'node:readline'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const kingdomRoot = path.join(__dirname, '..')
const registryPath = path.join(kingdomRoot, 'config', 'venture-registry.json')
const mcpRegistryPath = path.join(kingdomRoot, 'config', 'mcp-registry.json')

const ventureId =
  process.env.KINGDOM_VENTURE_ID ||
  (() => {
    const i = process.argv.indexOf('--venture')
    if (i >= 0) return process.argv[i + 1]
    const smokeIdx = process.argv.indexOf('--smoke')
    if (smokeIdx >= 0 && process.argv[smokeIdx + 1] && !process.argv[smokeIdx + 1].startsWith('-')) {
      return process.argv[smokeIdx + 1]
    }
    return 'kingdom-ops'
  })()
const SERVER_NAME = `kingdom-venture-${ventureId}`
const SERVER_VERSION = '0.1.0'

function expandHome(p) {
  if (!p) return p
  if (p.startsWith('~/')) return path.join(os.homedir(), p.slice(2))
  return p
}

function loadRegistry() {
  return JSON.parse(fs.readFileSync(registryPath, 'utf8'))
}

function loadMcpRegistry() {
  if (!fs.existsSync(mcpRegistryPath)) return { version: '1', servers: [] }
  return JSON.parse(fs.readFileSync(mcpRegistryPath, 'utf8'))
}

function resolveVenture(id) {
  const reg = loadRegistry()
  const entry = (reg.ventures || []).find((v) => v.id === id)
  if (!entry) throw new Error(`Venture not in registry: ${id}`)
  const root = expandHome(entry.repoPath)
  return { entry, root }
}

function readStatus(root, entry) {
  const rel = entry.paths?.status || 'STATUS.md'
  const abs = path.join(root, rel)
  if (!fs.existsSync(abs)) {
    return { ok: false, error: `STATUS missing: ${rel}`, path: abs }
  }
  const text = fs.readFileSync(abs, 'utf8')
  // Never return file contents that look like secrets
  if (/api[_-]?key|BEGIN (RSA |OPENSSH )?PRIVATE/i.test(text)) {
    return { ok: false, error: 'Refusing to return STATUS that looks secret-bearing' }
  }
  const progress = text.match(/\*\*Progress:\*\*\s*(.+)/i)?.[1]?.trim() || null
  const priority = text.match(/\*\*Priority:\*\*\s*(.+)/i)?.[1]?.trim() || null
  const version = text.match(/\*\*Version:\*\*\s*(.+)/i)?.[1]?.trim() || null
  const agent = text.match(/\*\*Agent:\*\*\s*(.+)/i)?.[1]?.trim() || null
  return {
    ok: true,
    venture_id: entry.id,
    path: rel,
    abs_path: abs,
    version,
    agent,
    progress,
    priority,
    excerpt: text.split(/\r?\n/).slice(0, 40).join('\n'),
    mtime: fs.statSync(abs).mtime.toISOString(),
  }
}

function readPhases(root, entry) {
  const rel = entry.paths?.phases
  if (!rel) {
    return {
      ok: true,
      venture_id: entry.id,
      phases: null,
      note: 'N/A — no paths.phases in registry',
    }
  }
  const abs = path.join(root, rel)
  if (!fs.existsSync(abs)) {
    return { ok: true, venture_id: entry.id, phases: null, note: `phases file missing: ${rel}` }
  }
  const raw = fs.readFileSync(abs, 'utf8')
  try {
    return { ok: true, venture_id: entry.id, path: rel, phases: JSON.parse(raw) }
  } catch {
    return {
      ok: true,
      venture_id: entry.id,
      path: rel,
      phases: null,
      note: 'phases file is not JSON',
      excerpt: raw.slice(0, 500),
    }
  }
}

function listCapabilities(entry) {
  const caps = Array.isArray(entry.capabilities) ? [...entry.capabilities] : []
  if (entry.dashboard?.port != null) caps.push(`dashboard:${entry.dashboard.port}`)
  if ((entry.tests?.commands || []).length) caps.push(`tests:${entry.id}`)
  if (entry.kind === 'research') caps.push(`research:${entry.id}`)
  const mcp = loadMcpRegistry().servers?.find((s) => s.venture_id === entry.id)
  if (mcp) caps.push(`mcp:${entry.id}`)
  return {
    ok: true,
    venture_id: entry.id,
    agent_id: entry.agentId,
    kind: entry.kind || null,
    dashboard: entry.dashboard || null,
    tests: (entry.tests?.commands || []).map((c) => ({
      id: c.id,
      label: c.label,
      type: c.type,
    })),
    capabilities: [...new Set(caps)],
    mcp: mcp
      ? {
          id: mcp.id,
          transport: mcp.transport,
          command: mcp.command,
          read_only: mcp.read_only !== false,
        }
      : null,
    forbidden: ['.env', 'secrets', 'model weights (*.pt)', 'contact dumps'],
  }
}

const TOOLS = [
  {
    name: 'get_status',
    description:
      'Read STATUS-derived JSON for the configured Kingdom venture (live file on disk). Read-only.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'get_phases',
    description:
      'Read tracking/phases.json (or registry paths.phases) if present; otherwise N/A. Read-only.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'list_capabilities',
    description:
      'List venture capabilities, dashboard, tests, and MCP registration. Never exposes secrets.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
]

function callTool(name) {
  const { entry, root } = resolveVenture(ventureId)
  if (name === 'get_status') return readStatus(root, entry)
  if (name === 'get_phases') return readPhases(root, entry)
  if (name === 'list_capabilities') return listCapabilities(entry)
  throw new Error(`Unknown tool: ${name}`)
}

function send(msg) {
  const line = JSON.stringify(msg)
  process.stdout.write(line + '\n')
}

function handleMessage(msg) {
  const { id, method, params } = msg
  if (method === 'initialize') {
    send({
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: params?.protocolVersion || '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
      },
    })
    return
  }
  if (method === 'notifications/initialized' || method === 'initialized') {
    return
  }
  if (method === 'tools/list') {
    send({ jsonrpc: '2.0', id, result: { tools: TOOLS } })
    return
  }
  if (method === 'tools/call') {
    try {
      const name = params?.name
      const result = callTool(name)
      send({
        jsonrpc: '2.0',
        id,
        result: {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          structuredContent: result,
          isError: result.ok === false,
        },
      })
    } catch (e) {
      send({
        jsonrpc: '2.0',
        id,
        result: {
          content: [{ type: 'text', text: String(e?.message || e) }],
          isError: true,
        },
      })
    }
    return
  }
  if (method === 'ping') {
    send({ jsonrpc: '2.0', id, result: {} })
    return
  }
  if (id != null) {
    send({
      jsonrpc: '2.0',
      id,
      error: { code: -32601, message: `Method not found: ${method}` },
    })
  }
}

function smoke() {
  const out = {
    server: SERVER_NAME,
    venture_id: ventureId,
    get_status: callTool('get_status'),
    get_phases: callTool('get_phases'),
    list_capabilities: callTool('list_capabilities'),
  }
  console.log(JSON.stringify(out, null, 2))
  if (!out.get_status.ok) process.exit(1)
}

if (process.argv.includes('--smoke')) {
  smoke()
  process.exit(0)
}

// Stdio MCP: newline-delimited JSON-RPC (also accept Content-Length framing lightly)
const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity })
let buf = ''
rl.on('line', (line) => {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('Content-Length:')) return
  try {
    const msg = JSON.parse(trimmed)
    handleMessage(msg)
  } catch {
    // ignore non-JSON
  }
})

// Some clients use Content-Length framing; accumulate stdin chunks
process.stdin.on('data', (chunk) => {
  // readline already handles lines; this is a no-op backup for pure NDJSON
  void chunk
})
