/**
 * Shared orchestrator API handlers — used by standalone server and Vite dev middleware.
 */
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { loadDashboardServices, serviceByName, serviceByVentureId } from './dashboard-services.mjs'
import { loadRegistry, getRegistryEntry, expandHome } from './registry.mjs'
import { runLocalTest } from './cicd.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const KINGDOM_ROOT = path.resolve(__dirname, '../..')
const LOG_DIR = path.join(process.env.TMPDIR || '/tmp', 'kingdom-dashboards')
const DASH_SCRIPT = path.join(KINGDOM_ROOT, 'scripts/start-dashboards.sh')

let services = loadDashboardServices(KINGDOM_ROOT).services

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

function json(res, status, body) {
  cors(res)
  if (!res.headersSent) {
    res.writeHead(status, { 'Content-Type': 'application/json' })
  }
  res.end(JSON.stringify(body))
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8')
        resolve(raw ? JSON.parse(raw) : {})
      } catch (e) {
        reject(e)
      }
    })
    req.on('error', reject)
  })
}

function portOpen(port) {
  try {
    execFileSync('nc', ['-z', '127.0.0.1', String(port)], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

function readPid(name) {
  const pidfile = path.join(LOG_DIR, `${name}.pid`)
  if (!fs.existsSync(pidfile)) return null
  const pid = Number(fs.readFileSync(pidfile, 'utf8').trim())
  return Number.isFinite(pid) ? pid : null
}

function logTail(name, lines = 20) {
  const logfile = path.join(LOG_DIR, `${name}.log`)
  if (!fs.existsSync(logfile)) return null
  try {
    const text = fs.readFileSync(logfile, 'utf8')
    return text.split('\n').slice(-lines).join('\n')
  } catch {
    return null
  }
}

function readServiceLog(name, lines = 80) {
  return logTail(name, lines) ?? ''
}

function serviceStatus(name) {
  const svc = serviceByName(services, name)
  if (!svc) return null
  const up = portOpen(svc.port)
  return {
    name,
    ventureId: svc.ventureId,
    label: svc.label,
    port: svc.port,
    url: svc.url,
    embed: svc.embed !== false,
    status: up ? 'up' : 'down',
    pid: readPid(name),
    workdir: svc.workdir,
    workdirExists: fs.existsSync(svc.workdir),
    logTail: logTail(name),
  }
}

function allServiceStatus() {
  return Object.keys(services).map((name) => serviceStatus(name))
}

function combineOutput(stdout, stderr) {
  return [stdout, stderr].filter(Boolean).join('\n').trim()
}

function runDashScript(args) {
  const result = spawnSync('bash', [DASH_SCRIPT, ...args], {
    cwd: KINGDOM_ROOT,
    encoding: 'utf8',
    timeout: 120_000,
    maxBuffer: 4 * 1024 * 1024,
  })
  const output = combineOutput(result.stdout ?? '', result.stderr ?? '')
  return {
    ok: result.status === 0,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    output,
    status: result.status,
  }
}

function runSync() {
  const result = spawnSync('node', [path.join(KINGDOM_ROOT, 'scripts/sync-kingdom.mjs')], {
    cwd: KINGDOM_ROOT,
    encoding: 'utf8',
    timeout: 180_000,
    maxBuffer: 4 * 1024 * 1024,
  })
  const output = combineOutput(result.stdout ?? '', result.stderr ?? '')
  return {
    ok: result.status === 0,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    output,
    synced_at: new Date().toISOString(),
  }
}

function runVentureTest(ventureId) {
  const registry = loadRegistry(KINGDOM_ROOT)
  const entry = getRegistryEntry(registry, ventureId)
  if (!entry) return { ok: false, error: `Unknown venture: ${ventureId}` }
  const dataDir = path.join(KINGDOM_ROOT, 'public/data')
  return runLocalTest(entry, dataDir, expandHome)
}

function resumeWorkdir() {
  const svc = serviceByName(services, 'resume')
  if (!svc?.workdir) return null
  return expandHome(svc.workdir)
}

function runFinishResume() {
  const workdir = resumeWorkdir()
  if (!workdir) return { ok: false, status: 1, error: 'Resume service not configured', output: '' }
  const result = spawnSync('npm', ['run', 'finish:resume'], {
    cwd: workdir,
    encoding: 'utf8',
    timeout: 600_000,
    maxBuffer: 8 * 1024 * 1024,
    shell: true,
  })
  const output = combineOutput(result.stdout ?? '', result.stderr ?? '')
  const status = result.status ?? 1
  return { ok: status === 0, status, output }
}

function runApproveLinkedIn() {
  const workdir = resumeWorkdir()
  if (!workdir) return { ok: false, status: 1, error: 'Resume service not configured', output: '' }

  const linkedinPath = path.join(workdir, 'knowledge', 'linkedin.json')
  if (!fs.existsSync(linkedinPath)) {
    return { ok: false, status: 404, error: 'knowledge/linkedin.json not found', output: '' }
  }

  let linkedin
  try {
    linkedin = JSON.parse(fs.readFileSync(linkedinPath, 'utf8'))
  } catch (e) {
    return { ok: false, status: 500, error: `Invalid linkedin.json: ${e.message}`, output: '' }
  }

  const approvedAt = new Date().toISOString()
  linkedin.status = 'APPROVED'
  linkedin.approved_at = approvedAt
  linkedin.approved_via = 'kingdom-resume-tab'
  linkedin.kingdom_approve_note =
    'Approved in Kingdom Resume tab — safe to post headline + about to LinkedIn (Featured links per featured-verdict.md).'
  linkedin.notes = [
    ...(linkedin.notes ?? []).filter((n) => !/^DRAFT/i.test(n)),
    `APPROVED ${approvedAt.slice(0, 10)} via Kingdom Resume tab — post headline + about when ready.`,
    'Do not feature WhatsApp Voice or YouTube Editor on LinkedIn until gates pass (see knowledge/featured-verdict.md).',
    'Verify BioNLP diagnosis metric with PI before citing 27 w-F1 publicly.',
  ]

  fs.writeFileSync(linkedinPath, `${JSON.stringify(linkedin, null, 2)}\n`, 'utf8')

  const sync = spawnSync('npm', ['run', 'sync:kingdom'], {
    cwd: workdir,
    encoding: 'utf8',
    timeout: 120_000,
    maxBuffer: 4 * 1024 * 1024,
    shell: true,
    env: { ...process.env, KINGDOM_ROOT: KINGDOM_ROOT },
  })
  const syncOutput = combineOutput(sync.stdout ?? '', sync.stderr ?? '')
  const output = [`Updated ${linkedinPath}`, `status → APPROVED (${approvedAt})`, '', syncOutput].join('\n')
  const ok = sync.status === 0
  return {
    ok,
    status: ok ? 0 : sync.status ?? 1,
    output,
    error: ok ? undefined : 'sync:kingdom failed after approval',
    linkedin: { status: linkedin.status, approved_at: approvedAt },
  }
}

/** @returns {Promise<boolean>} true if request was handled */
export async function handleOrchestratorRequest(req, res) {
  if (req.method === 'OPTIONS') {
    cors(res)
    res.writeHead(204)
    res.end()
    return true
  }

  const url = new URL(req.url ?? '/', 'http://127.0.0.1')
  if (!url.pathname.startsWith('/api')) return false

  const parts = url.pathname.split('/').filter(Boolean)

  try {
    services = loadDashboardServices(KINGDOM_ROOT).services
    if (req.method === 'GET' && parts[0] === 'api' && parts[1] === 'services' && !parts[2]) {
      json(res, 200, { services: allServiceStatus() })
      return true
    }

    if (req.method === 'GET' && parts[0] === 'api' && parts[1] === 'services' && parts[2] && parts[3] === 'logs') {
      const name = parts[2]
      if (!serviceByName(services, name)) {
        json(res, 404, { error: 'Unknown service' })
        return true
      }
      const lines = Number(url.searchParams.get('lines') ?? 80)
      json(res, 200, {
        name,
        log: logTail(name, lines) ?? readServiceLog(name, lines),
        service: serviceStatus(name),
      })
      return true
    }

    if (req.method === 'GET' && parts[0] === 'api' && parts[1] === 'services' && parts[2] && !parts[3]) {
      const st = serviceStatus(parts[2])
      if (!st) {
        json(res, 404, { error: 'Unknown service' })
        return true
      }
      json(res, 200, st)
      return true
    }

    if (req.method === 'GET' && parts[0] === 'api' && parts[1] === 'ventures' && parts[3] === 'service') {
      const svc = serviceByVentureId(services, parts[2])
      if (!svc) {
        json(res, 404, { error: 'No service for venture' })
        return true
      }
      json(res, 200, serviceStatus(svc.name))
      return true
    }

    if (req.method === 'POST' && parts[0] === 'api' && parts[1] === 'services' && parts[2] && parts[3]) {
      const name = parts[2]
      const action = parts[3]
      if (!serviceByName(services, name)) {
        json(res, 404, { error: 'Unknown service' })
        return true
      }

      if (action === 'start') {
        const out = runDashScript([name])
        const log = readServiceLog(name, 40)
        json(res, 200, {
          ok: out.ok,
          service: serviceStatus(name),
          output: [out.output, log].filter(Boolean).join('\n\n--- service log ---\n'),
        })
        return true
      }
      if (action === 'stop') {
        const out = runDashScript(['--stop', name])
        json(res, 200, { ok: out.ok, service: serviceStatus(name), output: out.output })
        return true
      }
      if (action === 'restart') {
        runDashScript(['--stop', name])
        const out = runDashScript([name])
        const log = readServiceLog(name, 40)
        json(res, 200, {
          ok: out.ok,
          service: serviceStatus(name),
          output: [out.output, log].filter(Boolean).join('\n\n--- service log ---\n'),
        })
        return true
      }
      if (action === 'finish-resume') {
        if (name !== 'resume') {
          json(res, 400, { error: 'finish-resume only available for resume service' })
          return true
        }
        const out = runFinishResume()
        const httpStatus = out.ok ? 200 : out.status === 1 ? 422 : 500
        json(res, httpStatus, {
          ok: out.ok,
          status: out.status,
          service: serviceStatus(name),
          output: out.output,
          error: out.error,
        })
        return true
      }
      if (action === 'approve-linkedin') {
        if (name !== 'resume') {
          json(res, 400, { error: 'approve-linkedin only available for resume service' })
          return true
        }
        const out = runApproveLinkedIn()
        const httpStatus = out.ok ? 200 : out.status === 404 ? 404 : 500
        json(res, httpStatus, {
          ok: out.ok,
          status: out.status,
          service: serviceStatus(name),
          output: out.output,
          error: out.error,
          linkedin: out.linkedin,
        })
        return true
      }
      json(res, 400, { error: 'Unknown action' })
      return true
    }

    if (req.method === 'POST' && parts[0] === 'api' && parts[1] === 'services' && parts[2] === 'start-all') {
      const names = Object.keys(services).filter((n) => n !== 'kingdom')
      const results = []
      const chunks = []
      for (const name of names) {
        const out = runDashScript([name])
        chunks.push(`[${name}]\n${out.output}`)
        results.push({ name, ok: out.ok, service: serviceStatus(name), output: out.output })
      }
      json(res, 200, { ok: true, results, output: chunks.join('\n\n') })
      return true
    }

    if (req.method === 'POST' && parts[0] === 'api' && parts[1] === 'services' && parts[2] === 'stop-all') {
      const out = runDashScript(['--stop'])
      json(res, 200, { ok: out.ok, services: allServiceStatus(), output: out.output })
      return true
    }

    if (req.method === 'POST' && parts[0] === 'api' && parts[1] === 'ventures' && parts[2] && parts[3] === 'test') {
      const body = await readBody(req).catch(() => ({}))
      const ventureId = parts[2]
      if (body.testId) {
        const registry = loadRegistry(KINGDOM_ROOT)
        const entry = getRegistryEntry(registry, ventureId)
        const tc = entry?.tests?.commands?.find((c) => c.id === body.testId)
        if (!tc) {
          json(res, 404, { error: 'Unknown test id' })
          return true
        }
        const repoRoot = expandHome(entry.repoPath)
        const t0 = Date.now()
        const result = spawnSync('bash', ['-lc', tc.cmd], {
          cwd: repoRoot,
          encoding: 'utf8',
          maxBuffer: 8 * 1024 * 1024,
        })
        const combined = combineOutput(result.stdout ?? '', result.stderr ?? '')
        const ok = result.status === 0
        json(res, 200, {
          ok,
          venture_id: ventureId,
          output: [`$ ${tc.cmd}`, combined, ok ? `✓ PASS (${Date.now() - t0}ms)` : `✗ FAIL (${Date.now() - t0}ms)`]
            .filter(Boolean)
            .join('\n'),
          results: [{
            id: tc.id,
            label: tc.label,
            type: tc.type,
            ok,
            duration_ms: Date.now() - t0,
            output: combined.slice(-4000) || null,
            error: ok ? undefined : (result.stderr || result.stdout || 'failed').slice(0, 800),
          }],
        })
        return true
      }
      json(res, 200, runVentureTest(ventureId))
      return true
    }

    if (req.method === 'POST' && parts[0] === 'api' && parts[1] === 'sync') {
      const out = runSync()
      json(res, out.ok ? 200 : 500, out)
      return true
    }

    if (req.method === 'GET' && parts[0] === 'api' && parts[1] === 'health') {
      json(res, 200, { ok: true, embedded: true })
      return true
    }

    json(res, 404, { error: 'Not found' })
    return true
  } catch (e) {
    json(res, 500, { error: e.message ?? 'Internal error' })
    return true
  }
}
