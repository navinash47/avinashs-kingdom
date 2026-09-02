#!/usr/bin/env node
/**
 * Inventory GitHub remotes for every venture in config/venture-registry.json.
 * Does NOT create repos — print what is missing so the human can confirm.
 */
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadRegistry, resolveRepoPath } from './lib/registry.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const registry = loadRegistry(ROOT)

function remoteUrl(repoRoot) {
  try {
    return execFileSync('git', ['remote', 'get-url', 'origin'], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return null
  }
}

function parseGithub(url) {
  if (!url) return null
  const m = url.match(/github\.com[/:]([^/]+)\/([^/.]+)/)
  return m ? { owner: m[1], repo: m[2] } : null
}

const rows = []
for (const entry of registry.ventures ?? []) {
  const repoRoot = resolveRepoPath(entry)
  if (!repoRoot) {
    rows.push({ id: entry.id, status: 'no-path', path: null, remote: null, github: entry.github })
    continue
  }
  const remote = remoteUrl(repoRoot)
  const gh = parseGithub(remote) ?? entry.github ?? null
  rows.push({
    id: entry.id,
    status: remote ? 'ok' : 'missing-remote',
    path: repoRoot,
    remote,
    github: gh,
    suggested_repo: entry.id,
  })
}

console.log('Git remote inventory')
console.log('====================')
for (const r of rows) {
  if (r.status === 'ok') {
    console.log(`✓ ${r.id}`)
    console.log(`    ${r.remote}`)
  } else if (r.status === 'missing-remote') {
    console.log(`✗ ${r.id} — NO origin`)
    console.log(`    path: ${r.path}`)
    console.log(`    suggest: gh repo create navinash47/<name> --private --source "${r.path}" --push`)
  } else {
    console.log(`— ${r.id} — no repoPath`)
  }
}

const missing = rows.filter((r) => r.status === 'missing-remote')
console.log('')
console.log(`Missing remotes: ${missing.length}`)
if (missing.length) {
  console.log('Confirm each name before I create/push. Suggested:')
  for (const r of missing) {
    console.log(`  ${r.id} → navinash47/${r.suggested_repo || r.id}`)
  }
}
