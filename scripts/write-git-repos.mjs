#!/usr/bin/env node
/**
 * List git project links: GitHub (gh API) + local origin remotes. No clones.
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadRegistry, resolveRepoPath } from './lib/registry.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

const SCAN_ROOTS = [
  path.join(process.env.HOME, 'Projects'),
  path.join(process.env.HOME, 'ProceduralCity'),
  path.join(process.env.HOME, 'Desktop/ComicMainEngine'),
]

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
  const m = url.match(/github\.com[:/]([^/]+)\/([^/.]+?)(?:\.git)?$/i)
  if (!m) return null
  return { owner: m[1], repo: m[2], web: `https://github.com/${m[1]}/${m[2]}` }
}

function findGitRepos(roots) {
  const repos = new Set()
  for (const root of roots) {
    if (!fs.existsSync(root)) continue
    try {
      const out = execFileSync('find', [root, '-name', '.git', '-type', 'd', '-prune', '-maxdepth', '6'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      })
      for (const line of out.split('\n').filter(Boolean)) {
        repos.add(path.dirname(line))
      }
    } catch {
      /* empty */
    }
  }
  return [...repos]
}

function ghRepos(owner = 'navinash47') {
  const raw = execFileSync('gh', ['repo', 'list', owner, '--limit', '200', '--json', 'name,url,isPrivate,description'], {
    encoding: 'utf8',
  })
  return JSON.parse(raw)
}

const registry = loadRegistry(ROOT)
const localPaths = new Set()

for (const entry of registry.ventures ?? []) {
  const p = resolveRepoPath(entry)
  if (p) localPaths.add(p)
}

for (const p of findGitRepos(SCAN_ROOTS)) {
  localPaths.add(p)
}

const byKey = new Map()

function key(owner, repo) {
  return `${owner.toLowerCase()}/${repo.toLowerCase()}`
}

for (const repoRoot of [...localPaths].sort()) {
  const remote = remoteUrl(repoRoot)
  const gh = parseGithub(remote)
  const k = gh ? key(gh.owner, gh.repo) : `local:${repoRoot}`
  const home = process.env.HOME || ''
  const displayPath = repoRoot.startsWith(home) ? '~' + repoRoot.slice(home.length) : repoRoot
  byKey.set(k, {
    owner: gh?.owner ?? null,
    repo: gh?.repo ?? path.basename(repoRoot),
    web: gh?.web ?? null,
    remote,
    localPath: displayPath,
    isPrivate: null,
    description: null,
    kingdomVenture: registry.ventures?.find((v) => resolveRepoPath(v) === repoRoot)?.id ?? null,
  })
}

for (const r of ghRepos()) {
  const k = key('navinash47', r.name)
  const existing = byKey.get(k) ?? {
    owner: 'navinash47',
    repo: r.name,
    web: r.url,
    remote: `https://github.com/navinash47/${r.name}.git`,
    localPath: null,
    isPrivate: r.isPrivate,
    description: r.description,
    kingdomVenture: registry.ventures?.find((v) => v.github?.repo === r.name)?.id ?? null,
  }
  existing.web = r.url
  existing.isPrivate = r.isPrivate
  existing.description = r.description ?? existing.description
  if (!existing.remote) existing.remote = `https://github.com/navinash47/${r.name}.git`
  byKey.set(k, existing)
}

const rows = [...byKey.values()].sort((a, b) => {
  const an = (a.repo || '').toLowerCase()
  const bn = (b.repo || '').toLowerCase()
  return an.localeCompare(bn)
})

const today = new Date().toISOString().slice(0, 10)
const lines = [
  '---',
  'type: overview',
  `updated: ${today}`,
  'tags: [git, github, repos]',
  '---',
  '',
  '# Git project links',
  '',
  `**${rows.length}** projects — GitHub API (gh repo list navinash47) plus local git remote get-url origin (no clones).`,
  '',
  '| Repo | Kingdom | Local path | Remote (origin) | Web | Visibility |',
  '|------|---------|------------|-----------------|-----|------------|',
]

for (const r of rows) {
  const repoLabel = r.web ? `[${r.repo}](${r.web})` : r.repo
  const kingdom = r.kingdomVenture ?? '—'
  const local = r.localPath ?? '—'
  const remote = r.remote ? `<code>${r.remote}</code>` : '—'
  const web = r.web ? `[open](${r.web})` : '—'
  const vis = r.isPrivate === null ? (r.localPath ? 'local only' : '—') : r.isPrivate ? 'private' : 'public'
  lines.push(`| ${repoLabel} | ${kingdom} | ${local} | ${remote} | ${web} | ${vis} |`)
}

lines.push(
  '',
  '## Regenerate',
  '',
  '```bash',
  'cd ~/Projects/avinashs-kingdom',
  'node scripts/write-git-repos.mjs',
  '```',
  '',
)

const out = path.join(ROOT, 'brain/wiki/ops/git-repos.md')
fs.writeFileSync(out, lines.join('\n'))
console.log(`Wrote ${out} (${rows.length} rows)`)
