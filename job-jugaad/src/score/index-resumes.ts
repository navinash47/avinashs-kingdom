import fs from 'node:fs'
import {
  type ResumesConfig,
  type ResumeIndex,
  type ResumeIndexEntry,
  readYaml,
  resolveFromRoot,
  writeJson,
} from '../lib/paths.js'

function firstExisting(paths: string[]): string | null {
  for (const p of paths) {
    const full = resolveFromRoot(p)
    if (fs.existsSync(full) && fs.statSync(full).isFile()) return full
  }
  return null
}

function summarizeFile(filePath: string): string {
  const ext = filePath.toLowerCase()
  if (ext.endsWith('.txt') || ext.endsWith('.md')) {
    return fs.readFileSync(filePath, 'utf8').slice(0, 4000)
  }
  // Binary resumes (pdf/docx): index by filename + sibling fixture text if any
  return `Binary resume at ${filePath} (content not extracted; use track keywords + label).`
}

export function buildResumeIndex(): ResumeIndex {
  const cfg = readYaml<ResumesConfig>('config/resumes.yaml')
  const tracks: ResumeIndexEntry[] = []
  for (const t of cfg.tracks) {
    const filePath = firstExisting(t.paths)
    if (!filePath) {
      console.warn(`No file found for track ${t.id}`)
      continue
    }
    const st = fs.statSync(filePath)
    tracks.push({
      id: t.id,
      label: t.label,
      keywords: t.keywords,
      filePath,
      summary: summarizeFile(filePath),
      mtimeMs: st.mtimeMs,
    })
  }
  const index: ResumeIndex = {
    generatedAt: new Date().toISOString(),
    tracks,
  }
  writeJson('data/resume-index.json', index)
  return index
}

export function loadResumeIndex(): ResumeIndex {
  const existing = resolveFromRoot('data/resume-index.json')
  if (fs.existsSync(existing)) {
    return JSON.parse(fs.readFileSync(existing, 'utf8')) as ResumeIndex
  }
  return buildResumeIndex()
}
