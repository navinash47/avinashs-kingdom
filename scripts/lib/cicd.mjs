import fs from 'node:fs'
import path from 'node:path'
import { execFileSync, spawnSync } from 'node:child_process'
import { loadManifestGithub } from './census.mjs'

function ghAvailable() {
  try {
    execFileSync('gh', ['auth', 'status'], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

function fetchGithubRuns(github) {
  if (!github?.owner || !github?.repo) return null
  try {
    const raw = execFileSync(
      'gh',
      [
        'run',
        'list',
        '--repo',
        `${github.owner}/${github.repo}`,
        '--limit',
        '5',
        '--json',
        'databaseId,conclusion,status,displayTitle,workflowName,createdAt,url,event',
      ],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    )
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function loadLocalTestSnapshot(dataDir, ventureId) {
  const p = path.join(dataDir, 'tests', `${ventureId}.json`)
  if (!fs.existsSync(p)) return null
  return JSON.parse(fs.readFileSync(p, 'utf8'))
}

function resolveGithub(entry, dataDir) {
  if (entry.github?.owner && entry.github?.repo) return entry.github
  return loadManifestGithub(dataDir, entry.id)
}

export function syncCicdSnapshots(registry, dataDir) {
  const cicdDir = path.join(dataDir, 'cicd')
  fs.mkdirSync(cicdDir, { recursive: true })
  const ghOk = ghAvailable()
  let count = 0

  for (const entry of registry.ventures ?? []) {
    const github = resolveGithub(entry, dataDir)
    const runs = ghOk && github ? fetchGithubRuns(github) : null
    const localTests = loadLocalTestSnapshot(dataDir, entry.id)
    const snapshot = {
      venture_id: entry.id,
      synced_at: new Date().toISOString(),
      github: github
        ? {
            ...github,
            available: ghOk,
            runs: runs ?? [],
            last_conclusion: runs?.[0]?.conclusion ?? null,
          }
        : null,
      local_tests: {
        commands: entry.tests?.commands ?? [],
        last_run: localTests,
      },
    }
    fs.writeFileSync(
      path.join(cicdDir, `${entry.id}.json`),
      JSON.stringify(snapshot, null, 2) + '\n',
    )
    count++
  }
  console.log(
    'Wrote CI/CD snapshots for',
    count,
    'ventures',
    ghOk ? '(gh ok)' : '(gh unavailable)',
  )
}

export function runLocalTest(entry, dataDir, expandHomeFn) {
  const repoRoot = expandHomeFn(entry.repoPath)
  if (!repoRoot || !entry.tests?.commands?.length) {
    return { ok: false, error: 'No test commands configured' }
  }
  const results = []
  const logLines = []
  const started = Date.now()
  for (const tc of entry.tests.commands) {
    const t0 = Date.now()
    logLines.push(`$ ${tc.cmd}`)
    const result = spawnSync('bash', ['-lc', tc.cmd], {
      cwd: repoRoot,
      encoding: 'utf8',
      maxBuffer: 8 * 1024 * 1024,
    })
    const combined = [result.stdout, result.stderr].filter(Boolean).join('\n')
    if (combined) logLines.push(combined)
    const ok = result.status === 0
    results.push({
      id: tc.id,
      label: tc.label,
      type: tc.type,
      ok,
      duration_ms: Date.now() - t0,
      output: combined.slice(-4000) || null,
      error: ok ? undefined : (result.stderr || result.stdout || 'failed').slice(0, 800),
    })
    logLines.push(ok ? `✓ ${tc.label} (${Date.now() - t0}ms)` : `✗ ${tc.label} (${Date.now() - t0}ms)`)
  }
  const snapshot = {
    venture_id: entry.id,
    ran_at: new Date().toISOString(),
    duration_ms: Date.now() - started,
    ok: results.every((r) => r.ok),
    results,
    output: logLines.join('\n'),
  }
  const testsDir = path.join(dataDir, 'tests')
  fs.mkdirSync(testsDir, { recursive: true })
  fs.writeFileSync(
    path.join(testsDir, `${entry.id}.json`),
    JSON.stringify(snapshot, null, 2) + '\n',
  )
  return snapshot
}
