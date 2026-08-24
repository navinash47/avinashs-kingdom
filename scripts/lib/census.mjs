import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { resolveRepoPath } from './registry.mjs'

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  '.venv',
  'venv',
  '__pycache__',
  'dist',
  'build',
  'target',
  '.next',
  '.turbo',
  'coverage',
  '.pytest_cache',
  '.mypy_cache',
  'Library',
  '.android',
  'DerivedData',
  'Assets',
  'StreamingAssets',
  'Pods',
  '.gradle',
  'vendor',
  '.idea',
  '.vscode',
  'egg-info',
])

const SOURCE_EXTS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.py',
  '.rs',
  '.go',
  '.java',
  '.kt',
  '.swift',
  '.cs',
  '.cpp',
  '.c',
  '.h',
  '.hpp',
  '.sql',
  '.sh',
  '.yaml',
  '.yml',
  '.toml',
])

const EXT_LANG = {
  '.ts': 'TypeScript',
  '.tsx': 'TypeScript',
  '.js': 'JavaScript',
  '.jsx': 'JavaScript',
  '.mjs': 'JavaScript',
  '.cjs': 'JavaScript',
  '.py': 'Python',
  '.rs': 'Rust',
  '.go': 'Go',
  '.java': 'Java',
  '.kt': 'Kotlin',
  '.swift': 'Swift',
  '.cs': 'C#',
  '.cpp': 'C++',
  '.c': 'C',
  '.h': 'C',
  '.hpp': 'C++',
  '.sql': 'SQL',
  '.sh': 'Shell',
  '.yaml': 'YAML',
  '.yml': 'YAML',
  '.toml': 'TOML',
  '.md': 'Markdown',
  '.json': 'JSON',
  '.css': 'CSS',
  '.html': 'HTML',
}

const MAX_WALK_FILES = 8000

function writeJson(p, value) {
  fs.writeFileSync(p, JSON.stringify(value, null, 2) + '\n')
}

function readJsonSafe(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'))
  } catch {
    return null
  }
}

export function parseGithubRemote(url) {
  if (!url) return null
  const ssh = url.match(/git@[^:]+:([^/]+)\/(.+?)(?:\.git)?$/)
  if (ssh) return { owner: ssh[1], repo: ssh[2], default_branch: 'main' }
  const https = url.match(/github\.com[/:]([^/]+)\/([^/.]+)/)
  if (https) return { owner: https[1], repo: https[2], default_branch: 'main' }
  return null
}

function gitMeta(repoRoot) {
  if (!repoRoot || !fs.existsSync(path.join(repoRoot, '.git'))) {
    return null
  }
  try {
    execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
  } catch {
    return null
  }
  try {
    const head = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
    const branch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
    const date = execFileSync('git', ['log', '-1', '--format=%cI'], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
    let remote = null
    try {
      remote = execFileSync('git', ['remote', 'get-url', 'origin'], {
        cwd: repoRoot,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim()
    } catch {
      /* no origin */
    }
    return {
      head,
      branch,
      last_commit_at: date,
      remote_url: remote,
      github: parseGithubRemote(remote),
    }
  } catch {
    return null
  }
}

function tryCloc(repoRoot) {
  try {
    const raw = execFileSync('cloc', ['--json', '--quiet', repoRoot], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 10 * 1024 * 1024,
    })
    const data = JSON.parse(raw)
    delete data.header
    delete data.SUM
    const langs = Object.entries(data)
      .filter(([k]) => !k.startsWith('SUM'))
      .map(([language, stats]) => ({
        language,
        files: stats.nFiles ?? 0,
        lines: (stats.code ?? 0) + (stats.comment ?? 0) + (stats.blank ?? 0),
        code_lines: stats.code ?? 0,
      }))
      .sort((a, b) => b.lines - a.lines)
    const sourceLangs = langs.filter((l) => l.language !== 'Markdown' && l.language !== 'JSON')
    const primary =
      sourceLangs.find((l) => SOURCE_EXTS.has('.' + l.language.toLowerCase()))?.language ??
      sourceLangs[0]?.language ??
      langs[0]?.language ??
      null
    const files = langs.reduce((s, l) => s + l.files, 0)
    const lines = langs.reduce((s, l) => s + l.lines, 0)
    return {
      files,
      lines,
      languages: langs,
      primary_language: primary,
      truncated: false,
      sampled_files: files,
      source: 'cloc',
    }
  } catch {
    return null
  }
}

function walkStats(repoRoot) {
  const byLang = {}
  let files = 0
  let lines = 0
  let truncated = false

  function walk(dir, depth = 0) {
    if (depth > 12 || files >= MAX_WALK_FILES) {
      if (files >= MAX_WALK_FILES) truncated = true
      return
    }
    let entries
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const ent of entries) {
      if (files >= MAX_WALK_FILES) {
        truncated = true
        break
      }
      const full = path.join(dir, ent.name)
      if (ent.isDirectory()) {
        if (SKIP_DIRS.has(ent.name) || ent.name.endsWith('.egg-info')) continue
        walk(full, depth + 1)
      } else if (ent.isFile()) {
        files++
        const ext = path.extname(ent.name).toLowerCase()
        const lang = EXT_LANG[ext] ?? 'Other'
        byLang[lang] ??= { files: 0, lines: 0 }
        byLang[lang].files++
        try {
          const stat = fs.statSync(full)
          if (stat.size > 512 * 1024) return
          const content = fs.readFileSync(full, 'utf8')
          const lc = content.split('\n').length
          byLang[lang].lines += lc
          lines += lc
        } catch {
          /* binary or unreadable */
        }
      }
    }
  }

  if (repoRoot && fs.existsSync(repoRoot)) walk(repoRoot)
  const langs = Object.entries(byLang)
    .map(([language, stats]) => ({ language, ...stats }))
    .sort((a, b) => b.lines - a.lines)
  const sourceLangs = langs.filter((l) => l.language !== 'Other' && l.language !== 'Markdown')
  const primary = sourceLangs[0]?.language ?? langs[0]?.language ?? null
  return {
    files,
    lines,
    languages: langs,
    primary_language: primary,
    truncated,
    sampled_files: files,
    source: 'walker',
  }
}

function loadCensusCache(cacheDir, ventureId, head) {
  if (!head) return null
  const p = path.join(cacheDir, `${ventureId}.json`)
  const cached = readJsonSafe(p)
  if (cached?.repo?.head === head && cached.stats) return cached
  return null
}

function saveCensusCache(cacheDir, ventureId, manifest) {
  fs.mkdirSync(cacheDir, { recursive: true })
  writeJson(path.join(cacheDir, `${ventureId}.json`), manifest)
}

function parseDependencies(repoRoot) {
  const deps = { runtime: [], dev: [] }
  const pkg = readJsonSafe(path.join(repoRoot, 'package.json'))
  if (pkg) {
    for (const [name, ver] of Object.entries(pkg.dependencies ?? {})) {
      deps.runtime.push({ name, version: String(ver), ecosystem: 'npm' })
    }
    for (const [name, ver] of Object.entries(pkg.devDependencies ?? {})) {
      deps.dev.push({ name, version: String(ver), ecosystem: 'npm' })
    }
    return { ecosystem: 'node', ...deps }
  }
  const pyproject = path.join(repoRoot, 'pyproject.toml')
  if (fs.existsSync(pyproject)) {
    const text = fs.readFileSync(pyproject, 'utf8')
    const depBlock = text.match(/\[project\.dependencies\]([\s\S]*?)(?=\n\[|$)/)
    if (depBlock) {
      for (const line of depBlock[1].split('\n')) {
        const m = line.match(/^\s*"([^"]+)"/)
        if (m) deps.runtime.push({ name: m[1], version: '', ecosystem: 'pypi' })
      }
    }
    return { ecosystem: 'python', ...deps }
  }
  if (fs.existsSync(path.join(repoRoot, 'requirements.txt'))) {
    const text = fs.readFileSync(path.join(repoRoot, 'requirements.txt'), 'utf8')
    for (const line of text.split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      deps.runtime.push({ name: t.split(/[=<>]/)[0], version: '', ecosystem: 'pypi' })
    }
    return { ecosystem: 'python', ...deps }
  }
  return { ecosystem: null, runtime: [], dev: [] }
}

function detectStorage(repoRoot, entry) {
  const stores = []
  if (!repoRoot) return stores
  function scan(dir, depth = 0) {
    if (depth > 4) return
    let entries
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const ent of entries) {
      const full = path.join(dir, ent.name)
      if (ent.isDirectory()) {
        if (SKIP_DIRS.has(ent.name)) continue
        scan(full, depth + 1)
      } else if (ent.name.endsWith('.db') || ent.name.endsWith('.sqlite')) {
        stores.push({
          type: 'sqlite',
          path: path.relative(repoRoot, full),
          note: 'Auto-detected database file',
        })
      }
    }
  }
  scan(repoRoot)
  for (const [, rel] of Object.entries(entry.paths ?? {})) {
    if (rel.endsWith('.json') || rel.endsWith('.jsonl')) {
      stores.push({
        type: rel.endsWith('.jsonl') ? 'jsonl' : 'json',
        path: rel,
        note: 'Registry path',
      })
    }
  }
  return stores.slice(0, 12)
}

function detectModels(repoRoot) {
  const models = new Set()
  if (!repoRoot) return []
  const scanFiles = ['.env.example', 'README.md', 'config.yaml', 'config.yml']
  for (const name of scanFiles) {
    const p = path.join(repoRoot, name)
    if (!fs.existsSync(p)) continue
    try {
      const text = fs.readFileSync(p, 'utf8')
      const re =
        /(?:model|MODEL|gpt-|claude-|gemini-|o1-|o3-|sonnet|opus|haiku)[a-z0-9._-]*/gi
      for (const m of text.match(re) ?? []) {
        if (m.length > 4 && m.length < 80) models.add(m)
      }
    } catch {
      /* skip */
    }
  }
  return [...models].slice(0, 20).map((name) => ({ name, source: 'config scan' }))
}

export function censusVenture(entry, kingdomRoot, ventureRow, suggestions, cacheDir) {
  const repoRoot = resolveRepoPath(entry)
  const synced_at = new Date().toISOString()
  if (!repoRoot || !fs.existsSync(repoRoot)) {
    suggestions.push(`${entry.id}: repo path missing or not found — check registry`)
    return {
      venture_id: entry.id,
      synced_at,
      repo: null,
      stats: null,
      dependencies: null,
      storage: [],
      models_detected: [],
      suggestions: [],
    }
  }

  const git = gitMeta(repoRoot)
  const cached = loadCensusCache(cacheDir, entry.id, git?.head)
  if (cached) {
    cached.synced_at = synced_at
    cached.spend_usd = ventureRow?.spendUsd ?? cached.spend_usd
    cached.ceiling_usd = ventureRow?.ceilingUsd ?? cached.ceiling_usd
    cached.progress = ventureRow?.progress ?? cached.progress
    cached.version = ventureRow?.version ?? cached.version
    return cached
  }

  let stats = tryCloc(repoRoot) ?? walkStats(repoRoot)
  const dependencies = parseDependencies(repoRoot)
  const storage = detectStorage(repoRoot, entry)
  const models_detected = detectModels(repoRoot)

  if (stats.truncated) {
    suggestions.push(
      `${entry.id}: census sampled ${stats.sampled_files} files (cap ${MAX_WALK_FILES}) — LOC is approximate`,
    )
  }

  if (!entry.github && git?.github) {
    suggestions.push(
      `${entry.id}: registry github hint → ${git.github.owner}/${git.github.repo}`,
    )
  }

  const manifest = {
    venture_id: entry.id,
    synced_at,
    repo: {
      path: repoRoot,
      head: git?.head ?? null,
      branch: git?.branch ?? null,
      last_commit_at: git?.last_commit_at ?? null,
      remote_url: git?.remote_url ?? null,
      github: entry.github ?? git?.github ?? null,
    },
    stats: {
      files: stats.files,
      lines: stats.lines,
      primary_language: stats.primary_language,
      languages: stats.languages,
      truncated: stats.truncated ?? false,
      sampled_files: stats.sampled_files ?? stats.files,
      source: stats.source ?? 'walker',
    },
    dependencies,
    storage,
    models_detected,
    spend_usd: ventureRow?.spendUsd ?? null,
    ceiling_usd: ventureRow?.ceilingUsd ?? null,
    progress: ventureRow?.progress ?? null,
    version: ventureRow?.version ?? null,
    test_commands: entry.tests?.commands ?? [],
    suggestions: [],
  }

  saveCensusCache(cacheDir, entry.id, manifest)
  return manifest
}

export function syncManifests(registry, kingdomRoot, ventures, dataDir) {
  const manifestsDir = path.join(dataDir, 'manifests')
  const cacheDir = path.join(manifestsDir, '.cache')
  fs.mkdirSync(manifestsDir, { recursive: true })
  const suggestions = []
  const index = []
  const registryHints = []

  for (const entry of registry.ventures ?? []) {
    if (!entry.repoPath && entry.id !== 'shorts') continue
    const ventureRow = ventures.find((v) => v.id === entry.id)
    const manifest = censusVenture(
      entry,
      kingdomRoot,
      ventureRow,
      suggestions,
      cacheDir,
    )
    manifest.suggestions = suggestions.filter((s) => s.startsWith(entry.id))
    for (const s of manifest.suggestions) {
      if (s.includes('registry github hint')) registryHints.push(s)
    }
    writeJson(path.join(manifestsDir, `${entry.id}.json`), manifest)
    index.push({
      id: entry.id,
      name: ventureRow?.name ?? entry.id,
      primary_language: manifest.stats?.primary_language ?? null,
      lines: manifest.stats?.lines ?? 0,
      files: manifest.stats?.files ?? 0,
      truncated: manifest.stats?.truncated ?? false,
      synced_at: manifest.synced_at,
    })
  }

  writeJson(path.join(dataDir, 'manifests-index.json'), {
    synced_at: new Date().toISOString(),
    ventures: index,
    global_suggestions: suggestions,
  })

  if (registryHints.length) {
    console.log('Registry github hints (manual update optional):')
    for (const h of registryHints) console.log(' ', h)
  }
  console.log('Wrote manifests for', index.length, 'ventures')
}

export function loadManifestGithub(dataDir, ventureId) {
  const p = path.join(dataDir, 'manifests', `${ventureId}.json`)
  const m = readJsonSafe(p)
  return m?.repo?.github ?? null
}
