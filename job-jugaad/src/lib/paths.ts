import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import yaml from 'js-yaml'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const ROOT = path.resolve(__dirname, '../..')

export function expandHome(p: string): string {
  if (p.startsWith('~/') || p === '~') {
    return path.join(os.homedir(), p.slice(2))
  }
  return p
}

export function resolveFromRoot(p: string): string {
  const expanded = expandHome(p)
  return path.isAbsolute(expanded) ? expanded : path.join(ROOT, expanded)
}

export function readYaml<T>(relOrAbs: string): T {
  const full = resolveFromRoot(relOrAbs)
  return yaml.load(fs.readFileSync(full, 'utf8')) as T
}

export function readJson<T>(relOrAbs: string, fallback: T): T {
  const full = resolveFromRoot(relOrAbs)
  if (!fs.existsSync(full)) return fallback
  return JSON.parse(fs.readFileSync(full, 'utf8')) as T
}

export function writeJson(relOrAbs: string, value: unknown): void {
  const full = resolveFromRoot(relOrAbs)
  fs.mkdirSync(path.dirname(full), { recursive: true })
  fs.writeFileSync(full, JSON.stringify(value, null, 2) + '\n')
}

export type ResumeTrack = {
  id: string
  label: string
  keywords: string[]
  paths: string[]
}

export type ResumesConfig = { tracks: ResumeTrack[] }

export type Company = {
  id: string
  name: string
  ats: 'greenhouse' | 'lever' | 'ashby' | 'career_page'
  board_token?: string
  career_url?: string
  notes?: string
}

export type CompaniesConfig = { companies: Company[] }

export type ResumeIndexEntry = {
  id: string
  label: string
  keywords: string[]
  filePath: string
  summary: string
  mtimeMs: number
}

export type ResumeIndex = {
  generatedAt: string
  tracks: ResumeIndexEntry[]
}

export type QueueItem = {
  id: string
  companyId: string
  companyName: string
  title: string
  url: string
  jdText: string
  ats: string
  chosenResumeId: string | null
  chosenResumePath: string | null
  confidence: number
  fitScore: number
  gaps: GapRow[]
  status:
    | 'queued'
    | 'gap-only'
    | 'filling'
    | 'waiting-on-you'
    | 'submitted'
    | 'failed'
  error?: string
  updatedAt: string
}

export type GapRow = {
  company: string
  role: string
  chosenResume: string
  gap: string
  why: string
  learnNext: string
}
