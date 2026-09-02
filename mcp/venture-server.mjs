#!/usr/bin/env node
/**
 * Kingdom venture MCP server (Phase 2b fleet).
 *
 * Driven by KINGDOM_VENTURE_ID (default kingdom-ops) and
 * config/venture-registry.json. Never reads .env, secrets, or model weights.
 *
 * Read tools (always): get_status, get_phases, list_capabilities
 * Write tools (gated): append_log, trigger_sync — require KINGDOM_MCP_WRITES=1
 *
 * Cursor: see .cursor/mcp.json and mcp/README.md
 *
 * Smoke: node mcp/venture-server.mjs --smoke [venture-id]
 * Fleet: npm run mcp:smoke:fleet
 */
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import readline from 'node:readline'
import { spawnSync } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const kingdomRoot = path.join(__dirname, '..')
const registryPath = path.join(kingdomRoot, 'config', 'venture-registry.json')
const mcpRegistryPath = path.join(kingdomRoot, 'config', 'mcp-registry.json')

const writesEnabled =
  process.env.KINGDOM_MCP_WRITES === '1' ||
  process.env.KINGDOM_MCP_WRITES === 'true'

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
const SERVER_VERSION = '0.2.0'

const FORBIDDEN_NAME =
  /(^|\/)\.env($|\.)|(^|\/)secrets?(\/|$)|credentials|\.pem$|\.pt$|\.safetensors$|id_rsa|contact.?dump/i

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
  if (!entry.repoPath) {
    throw new Error(`Venture ${id} has no repoPath (MCP N/A)`)
  }
  const root = expandHome(entry.repoPath)
  if (!root || !fs.existsSync(root)) {
    throw new Error(`Venture repo root missing: ${entry.repoPath}`)
  }
  return { entry, root }
}

function looksSecretBearing(text) {
  return /api[_-]?key\s*[:=]|BEGIN (RSA |OPENSSH )?PRIVATE|AWS_SECRET|PASSWORD\s*=/i.test(
    text,
  )
}

function readStatus(root, entry) {
  const rel = entry.paths?.status || 'STATUS.md'
  const abs = path.join(root, rel)
  if (!fs.existsSync(abs)) {
    return { ok: false, error: `STATUS missing: ${rel}`, path: abs }
  }
  if (FORBIDDEN_NAME.test(rel)) {
    return { ok: false, error: 'Refusing forbidden path' }
  }
  const text = fs.readFileSync(abs, 'utf8')
  if (looksSecretBearing(text)) {
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
  if (writesEnabled) caps.push('mcp:writes')
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
          read_only: !writesEnabled && mcp.read_only !== false,
          writes_enabled: writesEnabled,
        }
      : null,
    writes: {
      enabled: writesEnabled,
      tools: writesEnabled ? ['append_log', 'trigger_sync'] : [],
      enable_hint: 'Set KINGDOM_MCP_WRITES=1 to enable gated write tools',
    },
    forbidden: ['.env', 'secrets', 'model weights (*.pt)', 'contact dumps'],
  }
}

/**
 * Append a single dated line to tracking/mcp-agent-log.md (create if needed).
 * Never writes outside the venture root; refuses secret-looking payloads.
 */
function appendLog(root, entry, args = {}) {
  if (!writesEnabled) {
    return {
      ok: false,
      error: 'Writes disabled. Set KINGDOM_MCP_WRITES=1 to enable append_log.',
    }
  }
  const message = String(args.message || args.text || '').trim()
  if (!message) {
    return { ok: false, error: 'append_log requires { message: string }' }
  }
  if (message.length > 2000) {
    return { ok: false, error: 'message too long (max 2000 chars)' }
  }
  if (looksSecretBearing(message) || FORBIDDEN_NAME.test(message)) {
    return { ok: false, error: 'Refusing message that looks secret-bearing' }
  }
  const rel = 'tracking/mcp-agent-log.md'
  const abs = path.join(root, rel)
  const dir = path.dirname(abs)
  fs.mkdirSync(dir, { recursive: true })
  const stamp = new Date().toISOString()
  const line = `- **${stamp}** [${entry.id}] ${message.replace(/\r?\n/g, ' ')}\n`
  if (!fs.existsSync(abs)) {
    fs.writeFileSync(
      abs,
      `# MCP agent log — ${entry.id}\n\nAppend-only. Never put secrets here.\n\n`,
      'utf8',
    )
  }
  fs.appendFileSync(abs, line, 'utf8')
  return {
    ok: true,
    venture_id: entry.id,
    path: rel,
    appended: line.trim(),
  }
}

/**
 * Trigger Kingdom sync from kingdom root only. Never passes env secrets through.
 */
function triggerSync(entry, args = {}) {
  if (!writesEnabled) {
    return {
      ok: false,
      error: 'Writes disabled. Set KINGDOM_MCP_WRITES=1 to enable trigger_sync.',
    }
  }
  // Always run sync from Kingdom repo — fleet snapshot lives here
  const dry = Boolean(args.dry_run)
  if (dry) {
    return {
      ok: true,
      dry_run: true,
      venture_id: entry.id,
      would_run: 'npm run sync',
      cwd: kingdomRoot,
    }
  }
  const result = spawnSync('npm', ['run', 'sync'], {
    cwd: kingdomRoot,
    encoding: 'utf8',
    env: {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      NODE_ENV: process.env.NODE_ENV,
    },
    timeout: 120_000,
  })
  return {
    ok: result.status === 0,
    venture_id: entry.id,
    exit_code: result.status,
    stdout_tail: (result.stdout || '').slice(-1500),
    stderr_tail: (result.stderr || '').slice(-800),
    note: 'Ran npm run sync in Kingdom root; secrets not forwarded',
  }
}

const READ_TOOLS = [
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

const WRITE_TOOLS = [
  {
    name: 'append_log',
    description:
      'Gated write: append one line to tracking/mcp-agent-log.md. Requires KINGDOM_MCP_WRITES=1. Never secrets.',
    inputSchema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Short non-secret log line' },
      },
      required: ['message'],
      additionalProperties: false,
    },
  },
  {
    name: 'trigger_sync',
    description:
      'Gated write: run Kingdom npm run sync (fleet snapshot). Requires KINGDOM_MCP_WRITES=1.',
    inputSchema: {
      type: 'object',
      properties: {
        dry_run: { type: 'boolean', description: 'If true, do not execute sync' },
      },
      additionalProperties: false,
    },
  },
]

function toolList() {
  return writesEnabled ? [...READ_TOOLS, ...WRITE_TOOLS] : READ_TOOLS
}

function callTool(name, args = {}) {
  const { entry, root } = resolveVenture(ventureId)
  if (name === 'get_status') return readStatus(root, entry)
  if (name === 'get_phases') return readPhases(root, entry)
  if (name === 'list_capabilities') return listCapabilities(entry)
  if (name === 'append_log') return appendLog(root, entry, args)
  if (name === 'trigger_sync') return triggerSync(entry, args)
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
    send({ jsonrpc: '2.0', id, result: { tools: toolList() } })
    return
  }
  if (method === 'tools/call') {
    try {
      const name = params?.name
      const args = params?.arguments || {}
      const result = callTool(name, args)
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

function summarizePhases(phasesResult) {
  if (!phasesResult || phasesResult.phases == null) {
    return {
      ok: phasesResult?.ok !== false,
      venture_id: phasesResult?.venture_id || ventureId,
      phases: null,
      note: phasesResult?.note || 'N/A',
    }
  }
  const p = phasesResult.phases
  return {
    ok: true,
    venture_id: phasesResult.venture_id,
    path: phasesResult.path,
    phases_summary: {
      current_phase: p.current_phase ?? null,
      stage_count: Array.isArray(p.stages) ? p.stages.length : null,
      keys: Object.keys(p).slice(0, 20),
      approx_bytes: JSON.stringify(p).length,
    },
    note: 'smoke truncates full phases; use get_phases tool for full JSON',
  }
}

function smoke() {
  const status = callTool('get_status')
  const phases = summarizePhases(callTool('get_phases'))
  const caps = callTool('list_capabilities')
  const out = {
    server: SERVER_NAME,
    venture_id: ventureId,
    writes_enabled: writesEnabled,
    get_status: status,
    get_phases: phases,
    list_capabilities: caps,
  }
  // Prove write tools refuse when gated off (default smoke)
  if (!writesEnabled) {
    out.append_log_gated = callTool('append_log', { message: 'smoke should refuse' })
    out.trigger_sync_gated = callTool('trigger_sync', { dry_run: true })
  }
  console.log(JSON.stringify(out, null, 2))
  if (!status.ok) process.exit(1)
  if (!writesEnabled) {
    if (out.append_log_gated.ok || out.trigger_sync_gated.ok) {
      console.error('Expected write tools to refuse without KINGDOM_MCP_WRITES=1')
      process.exit(1)
    }
  }
}

if (process.argv.includes('--smoke')) {
  smoke()
  process.exit(0)
}

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity })
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

process.stdin.on('data', (chunk) => {
  void chunk
})
