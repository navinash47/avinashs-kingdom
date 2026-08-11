import { DatabaseSync } from 'node:sqlite'
import fs from 'node:fs'
import { resolveFromRoot } from '../lib/paths.js'

export type CompanyRow = {
  id: string
  name: string
  ats: string | null
  board_token: string | null
  career_url: string | null
  source: string
  notes: string | null
  created_at: string
  updated_at: string
}

export type JobRow = {
  id: string
  company_id: string
  title: string
  url: string
  location: string | null
  source: string
  ats: string | null
  jd_text: string
  fit_score: number
  resume_track: string | null
  resume_path: string | null
  status: string
  relevance: number
  error: string | null
  confirmation_email_seen: number
  first_seen_at: string
  updated_at: string
}

export type ApplicationRow = {
  id: number
  job_id: string
  status: string
  resume_track: string | null
  notes: string | null
  created_at: string
}

let db: DatabaseSync | null = null

export function getDb(): DatabaseSync {
  if (db) return db
  const path = resolveFromRoot('data/job-jugaad.sqlite')
  fs.mkdirSync(resolveFromRoot('data'), { recursive: true })
  db = new DatabaseSync(path)
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      ats TEXT,
      board_token TEXT,
      career_url TEXT,
      source TEXT NOT NULL DEFAULT 'manual',
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      title TEXT NOT NULL,
      url TEXT NOT NULL UNIQUE,
      location TEXT,
      source TEXT NOT NULL,
      ats TEXT,
      jd_text TEXT NOT NULL DEFAULT '',
      fit_score REAL NOT NULL DEFAULT 0,
      resume_track TEXT,
      resume_path TEXT,
      status TEXT NOT NULL DEFAULT 'discovered',
      relevance REAL NOT NULL DEFAULT 0,
      error TEXT,
      confirmation_email_seen INTEGER NOT NULL DEFAULT 0,
      first_seen_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (company_id) REFERENCES companies(id)
    );
    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id TEXT NOT NULL,
      status TEXT NOT NULL,
      resume_track TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (job_id) REFERENCES jobs(id)
    );
    CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
    CREATE INDEX IF NOT EXISTS idx_jobs_fit ON jobs(fit_score DESC);
    CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company_id);
  `)
  return db
}

export function upsertCompany(input: {
  id: string
  name: string
  ats?: string | null
  board_token?: string | null
  career_url?: string | null
  source?: string
  notes?: string | null
}): void {
  const now = new Date().toISOString()
  getDb()
    .prepare(
      `INSERT INTO companies (id, name, ats, board_token, career_url, source, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name=excluded.name,
         ats=COALESCE(excluded.ats, companies.ats),
         board_token=COALESCE(excluded.board_token, companies.board_token),
         career_url=COALESCE(excluded.career_url, companies.career_url),
         source=excluded.source,
         notes=COALESCE(excluded.notes, companies.notes),
         updated_at=excluded.updated_at`,
    )
    .run(
      input.id,
      input.name,
      input.ats ?? null,
      input.board_token ?? null,
      input.career_url ?? null,
      input.source ?? 'manual',
      input.notes ?? null,
      now,
      now,
    )
}

export function upsertJob(input: {
  id: string
  company_id: string
  title: string
  url: string
  location?: string | null
  source: string
  ats?: string | null
  jd_text?: string
  fit_score?: number
  resume_track?: string | null
  resume_path?: string | null
  status?: string
  relevance?: number
}): void {
  const now = new Date().toISOString()
  getDb()
    .prepare(
      `INSERT INTO jobs (
         id, company_id, title, url, location, source, ats, jd_text,
         fit_score, resume_track, resume_path, status, relevance,
         error, confirmation_email_seen, first_seen_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 0, ?, ?)
       ON CONFLICT(url) DO UPDATE SET
         title=excluded.title,
         location=COALESCE(excluded.location, jobs.location),
         jd_text=CASE WHEN length(excluded.jd_text)>length(jobs.jd_text) THEN excluded.jd_text ELSE jobs.jd_text END,
         fit_score=CASE WHEN excluded.fit_score>jobs.fit_score THEN excluded.fit_score ELSE jobs.fit_score END,
         resume_track=COALESCE(excluded.resume_track, jobs.resume_track),
         resume_path=COALESCE(excluded.resume_path, jobs.resume_path),
         relevance=CASE WHEN excluded.relevance>jobs.relevance THEN excluded.relevance ELSE jobs.relevance END,
         updated_at=excluded.updated_at`,
    )
    .run(
      input.id,
      input.company_id,
      input.title,
      input.url,
      input.location ?? null,
      input.source,
      input.ats ?? null,
      input.jd_text ?? '',
      input.fit_score ?? 0,
      input.resume_track ?? null,
      input.resume_path ?? null,
      input.status ?? 'discovered',
      input.relevance ?? 0,
      now,
      now,
    )
}

export function updateJobStatus(
  id: string,
  status: string,
  error?: string | null,
): void {
  getDb()
    .prepare(
      `UPDATE jobs SET status=?, error=?, updated_at=? WHERE id=?`,
    )
    .run(status, error ?? null, new Date().toISOString(), id)
}

export function recordApplication(input: {
  job_id: string
  status: string
  resume_track?: string | null
  notes?: string | null
}): void {
  getDb()
    .prepare(
      `INSERT INTO applications (job_id, status, resume_track, notes, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(
      input.job_id,
      input.status,
      input.resume_track ?? null,
      input.notes ?? null,
      new Date().toISOString(),
    )
}

export function listJobs(opts: {
  status?: string
  minFit?: number
  limit?: number
  diversifyCompanies?: boolean
  preferFreshCompanies?: boolean
} = {}): JobRow[] {
  const minFit = opts.minFit ?? 0
  const limit = opts.limit ?? 100
  const db = getDb()

  if (opts.diversifyCompanies) {
    const busy = opts.preferFreshCompanies
      ? new Set(
          (
            db
              .prepare(
                `SELECT DISTINCT company_id FROM jobs WHERE status IN ('submitted','filling','waiting-on-you','failed')`,
              )
              .all() as Array<{ company_id: string }>
          ).map((r) => r.company_id),
        )
      : new Set<string>()

    const perCompany = db
      .prepare(
        opts.status
          ? `SELECT * FROM (
               SELECT *, ROW_NUMBER() OVER (
                 PARTITION BY company_id ORDER BY fit_score DESC, relevance DESC
               ) AS rn
               FROM jobs WHERE status=? AND fit_score>=?
             ) t WHERE rn=1
             ORDER BY fit_score DESC, relevance DESC`
          : `SELECT * FROM (
               SELECT *, ROW_NUMBER() OVER (
                 PARTITION BY company_id ORDER BY fit_score DESC, relevance DESC
               ) AS rn
               FROM jobs WHERE fit_score>=?
             ) t WHERE rn=1
             ORDER BY fit_score DESC, relevance DESC`,
      )
      .all(
        ...(opts.status ? [opts.status, minFit] : [minFit]),
      ) as Array<JobRow & { rn?: number }>

    const fresh = perCompany.filter((r) => !busy.has(r.company_id))
    const used = perCompany.filter((r) => busy.has(r.company_id))
    return [...fresh, ...used].slice(0, limit)
  }

  if (opts.status) {
    return db
      .prepare(
        `SELECT * FROM jobs WHERE status=? AND fit_score>=? ORDER BY fit_score DESC, relevance DESC LIMIT ?`,
      )
      .all(opts.status, minFit, limit) as JobRow[]
  }
  return db
    .prepare(
      `SELECT * FROM jobs WHERE fit_score>=? ORDER BY fit_score DESC, relevance DESC LIMIT ?`,
    )
    .all(minFit, limit) as JobRow[]
}

export function listCompanies(): CompanyRow[] {
  return getDb()
    .prepare(`SELECT * FROM companies ORDER BY name`)
    .all() as CompanyRow[]
}

export function jobStats(): Record<string, number> {
  const rows = getDb()
    .prepare(`SELECT status, COUNT(*) as n FROM jobs GROUP BY status`)
    .all() as Array<{ status: string; n: number }>
  const out: Record<string, number> = {}
  for (const r of rows) out[r.status] = Number(r.n)
  return out
}
