import { DatabaseSync } from 'node:sqlite'
import fs from 'node:fs'
import { resolveFromRoot } from '../lib/paths.js'
import { isTargetApplyRole } from '../jobs/full-time.js'
import { isUsRole } from '../jobs/location.js'
import { normalizeJobUrl } from '../jobs/url.js'

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
  attempt_count: number
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

export type GapDbRow = {
  id: number
  company: string
  role: string
  job_id: string | null
  chosen_resume: string | null
  gap: string
  why: string | null
  learn_next: string | null
  created_at: string
}

const APPLIED_STATUSES = new Set(['submitted', 'filling', 'waiting-on-you'])

/** Max auto-apply attempts per job before marking manual-apply (not applied). */
export function maxApplyAttempts(): number {
  const n = Number(process.env.JOB_JUGAAD_MAX_ATTEMPTS || 3)
  return Number.isFinite(n) && n >= 1 ? Math.min(Math.floor(n), 10) : 3
}

let db: DatabaseSync | null = null

function migrateSchema(conn: DatabaseSync): void {
  const cols = conn
    .prepare(`PRAGMA table_info(jobs)`)
    .all() as Array<{ name: string }>
  const names = new Set(cols.map((c) => c.name))
  if (!names.has('attempt_count')) {
    conn.exec(
      `ALTER TABLE jobs ADD COLUMN attempt_count INTEGER NOT NULL DEFAULT 0`,
    )
    // Prior waiting/failed rows already burned ≥1 attempt before this column existed
    conn.exec(
      `UPDATE jobs SET attempt_count = 1
       WHERE attempt_count = 0
         AND status IN ('waiting-on-you','failed','manual-apply')`,
    )
  }
}

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
      attempt_count INTEGER NOT NULL DEFAULT 0,
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
    CREATE TABLE IF NOT EXISTS gaps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company TEXT NOT NULL,
      role TEXT NOT NULL,
      job_id TEXT,
      chosen_resume TEXT,
      gap TEXT NOT NULL,
      why TEXT,
      learn_next TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
    CREATE INDEX IF NOT EXISTS idx_jobs_fit ON jobs(fit_score DESC);
    CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company_id);
    CREATE INDEX IF NOT EXISTS idx_jobs_url ON jobs(url);
    CREATE INDEX IF NOT EXISTS idx_gaps_company ON gaps(company);
    CREATE INDEX IF NOT EXISTS idx_apps_job ON applications(job_id);
  `)
  migrateSchema(db)
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
  const url = normalizeJobUrl(input.url)
  const existing = getDb()
    .prepare(`SELECT id, status FROM jobs WHERE url=?`)
    .get(url) as { id: string; status: string } | undefined

  // Never re-queue / overwrite a job link already in apply flow or submitted
  if (existing && APPLIED_STATUSES.has(existing.status)) {
    getDb()
      .prepare(
        `UPDATE jobs SET
           title=?,
           location=COALESCE(?, location),
           jd_text=CASE WHEN length(?)>length(jd_text) THEN ? ELSE jd_text END,
           fit_score=MAX(fit_score, ?),
           updated_at=?
         WHERE url=?`,
      )
      .run(
        input.title,
        input.location ?? null,
        input.jd_text ?? '',
        input.jd_text ?? '',
        input.fit_score ?? 0,
        now,
        url,
      )
    return
  }

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
         status=CASE
           WHEN jobs.status IN ('submitted','filling','waiting-on-you','manual-apply') THEN jobs.status
           ELSE COALESCE(excluded.status, jobs.status)
         END,
         relevance=CASE WHEN excluded.relevance>jobs.relevance THEN excluded.relevance ELSE jobs.relevance END,
         updated_at=excluded.updated_at`,
    )
    .run(
      existing?.id || input.id,
      input.company_id,
      input.title,
      url,
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
    .prepare(`UPDATE jobs SET status=?, error=?, updated_at=? WHERE id=?`)
    .run(status, error ?? null, new Date().toISOString(), id)
}

/** Bump attempt_count; returns the new count. */
export function incrementAttempt(id: string): number {
  const conn = getDb()
  const now = new Date().toISOString()
  conn
    .prepare(
      `UPDATE jobs SET attempt_count = attempt_count + 1, updated_at=? WHERE id=?`,
    )
    .run(now, id)
  const row = conn
    .prepare(`SELECT attempt_count FROM jobs WHERE id=?`)
    .get(id) as { attempt_count: number } | undefined
  return Number(row?.attempt_count ?? 0)
}

export function getAttemptCount(id: string): number {
  const row = getDb()
    .prepare(`SELECT attempt_count FROM jobs WHERE id=?`)
    .get(id) as { attempt_count: number } | undefined
  return Number(row?.attempt_count ?? 0)
}

/**
 * After an apply attempt: if not submitted and attempts >= max → manual-apply
 * (not applied — human applies via emailed link). Returns final status.
 */
export function finalizeApplyAttempt(
  id: string,
  resultStatus: string,
  error?: string | null,
): string {
  const attempts = getAttemptCount(id)
  const max = maxApplyAttempts()
  if (resultStatus === 'submitted') {
    updateJobStatus(id, 'submitted', error)
    return 'submitted'
  }
  if (
    (resultStatus === 'waiting-on-you' ||
      resultStatus === 'failed' ||
      resultStatus === 'filling') &&
    attempts >= max
  ) {
    const reason =
      (error ? `${error} · ` : '') +
      `Auto-apply exhausted (${attempts}/${max}) — apply manually`
    updateJobStatus(id, 'manual-apply', reason)
    return 'manual-apply'
  }
  updateJobStatus(id, resultStatus, error)
  return resultStatus
}

/** Jobs needing human apply: Cloudflare walls, CAPTCHA, exhausted retries. */
export function listManualDigestJobs(limit = 50): JobRow[] {
  return getDb()
    .prepare(
      `SELECT * FROM jobs
       WHERE status IN ('manual-apply','waiting-on-you')
          OR (status='failed' AND (
            error LIKE '%CAPTCHA%' OR error LIKE '%bot wall%' OR
            error LIKE '%Cloudflare%' OR error LIKE '%cloudflare%' OR
            error LIKE '%Attention Required%' OR error LIKE '%Just a moment%'
          ))
       ORDER BY
         CASE status WHEN 'manual-apply' THEN 0 WHEN 'waiting-on-you' THEN 1 ELSE 2 END,
         updated_at DESC
       LIMIT ?`,
    )
    .all(limit) as JobRow[]
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

/** True if auto-apply should skip this job (submitted / in-flight / manual-apply).
 *  allowWaitingResume: resume:waiting can re-open waiting-on-you.
 *  allowRetryWaiting: auto-apply may retry waiting-on-you while attempts < max. */
export function alreadyApplied(
  jobIdOrUrl: string,
  opts: { allowWaitingResume?: boolean; allowRetryWaiting?: boolean } = {},
): boolean {
  const conn = getDb()
  const url = normalizeJobUrl(jobIdOrUrl)
  const byId = conn
    .prepare(
      `SELECT status, attempt_count FROM jobs WHERE id=? OR url=? LIMIT 1`,
    )
    .get(jobIdOrUrl, url) as
    | { status: string; attempt_count: number }
    | undefined
  if (byId) {
    if (byId.status === 'submitted' || byId.status === 'filling') return true
    if (byId.status === 'manual-apply') return true
    if (byId.status === 'waiting-on-you') {
      if (opts.allowWaitingResume) {
        // fall through — check applications for submitted only
      } else if (
        opts.allowRetryWaiting &&
        Number(byId.attempt_count) < maxApplyAttempts()
      ) {
        return false
      } else {
        return true
      }
    }
  }
  const statuses = opts.allowWaitingResume
    ? `('submitted','filling')`
    : `('submitted','waiting-on-you','filling')`
  const app = conn
    .prepare(
      `SELECT a.status FROM applications a
       JOIN jobs j ON j.id=a.job_id
       WHERE (j.id=? OR j.url=?) AND a.status IN ${statuses}
       LIMIT 1`,
    )
    .get(jobIdOrUrl, url) as { status: string } | undefined
  return Boolean(app)
}

export function insertGap(input: {
  company: string
  role: string
  job_id?: string | null
  chosen_resume?: string | null
  gap: string
  why?: string | null
  learn_next?: string | null
}): void {
  getDb()
    .prepare(
      `INSERT INTO gaps (company, role, job_id, chosen_resume, gap, why, learn_next, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.company,
      input.role,
      input.job_id ?? null,
      input.chosen_resume ?? null,
      input.gap,
      input.why ?? null,
      input.learn_next ?? null,
      new Date().toISOString(),
    )
}

export function listGaps(opts: {
  company?: string
  q?: string
  limit?: number
} = {}): GapDbRow[] {
  const limit = opts.limit ?? 200
  const conn = getDb()
  if (opts.company) {
    return conn
      .prepare(`SELECT * FROM gaps WHERE company=? ORDER BY id DESC LIMIT ?`)
      .all(opts.company, limit) as GapDbRow[]
  }
  if (opts.q) {
    const like = `%${opts.q}%`
    return conn
      .prepare(
        `SELECT * FROM gaps WHERE company LIKE ? OR role LIKE ? OR gap LIKE ? OR why LIKE ? OR learn_next LIKE ?
         ORDER BY id DESC LIMIT ?`,
      )
      .all(like, like, like, like, like, limit) as GapDbRow[]
  }
  return conn
    .prepare(`SELECT * FROM gaps ORDER BY id DESC LIMIT ?`)
    .all(limit) as GapDbRow[]
}

export function queryJobs(opts: {
  status?: string
  companyId?: string
  q?: string
  minFit?: number
  limit?: number
  offset?: number
  usOnly?: boolean
  fullTimeOnly?: boolean
} = {}): JobRow[] {
  const limit = opts.limit ?? 100
  const offset = opts.offset ?? 0
  const minFit = opts.minFit ?? 0
  const clauses: string[] = ['fit_score>=?']
  const params: Array<string | number> = [minFit]
  if (opts.status) {
    clauses.push('status=?')
    params.push(opts.status)
  }
  if (opts.companyId) {
    clauses.push('company_id=?')
    params.push(opts.companyId)
  }
  if (opts.q) {
    clauses.push("(title LIKE ? OR url LIKE ? OR IFNULL(location,'') LIKE ?)")
    const like = `%${opts.q}%`
    params.push(like, like, like)
  }
  params.push(Math.max(limit * 6, 300), offset)
  const rows = getDb()
    .prepare(
      `SELECT * FROM jobs WHERE ${clauses.join(' AND ')}
       ORDER BY fit_score DESC, updated_at DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params) as JobRow[]

  return rows
    .filter((r) => {
      if (
        opts.fullTimeOnly !== false &&
        !isTargetApplyRole(r.title, r.jd_text || '')
      ) {
        return false
      }
      if (
        opts.usOnly !== false &&
        !isUsRole(r.location, r.title, r.jd_text || '')
      ) {
        return false
      }
      return true
    })
    .slice(0, limit)
}

export function listJobs(opts: {
  status?: string
  minFit?: number
  limit?: number
  diversifyCompanies?: boolean
  preferFreshCompanies?: boolean
  fullTimeOnly?: boolean
  usOnly?: boolean
} = {}): JobRow[] {
  const minFit = opts.minFit ?? 0
  const limit = opts.limit ?? 100
  const fullTimeOnly = opts.fullTimeOnly !== false
  const usOnly = opts.usOnly !== false
  const conn = getDb()

  const filterRows = (rows: JobRow[]) =>
    rows.filter((r) => {
      if (fullTimeOnly && !isTargetApplyRole(r.title, r.jd_text || '')) return false
      if (usOnly && !isUsRole(r.location, r.title, r.jd_text || '')) return false
      return true
    })

  if (opts.diversifyCompanies) {
    const busy = opts.preferFreshCompanies
      ? new Set(
          (
            conn
              .prepare(
                `SELECT DISTINCT company_id FROM jobs WHERE status IN ('submitted','filling','waiting-on-you','manual-apply','failed')`,
              )
              .all() as Array<{ company_id: string }>
          ).map((r) => r.company_id),
        )
      : new Set<string>()

    const fetchN = Math.max(limit * 20, 200)
    const perCompany = conn
      .prepare(
        opts.status
          ? `SELECT * FROM (
               SELECT *, ROW_NUMBER() OVER (
                 PARTITION BY company_id ORDER BY fit_score DESC, relevance DESC
               ) AS rn
               FROM jobs WHERE status=? AND fit_score>=?
             ) t WHERE rn<=5
             ORDER BY fit_score DESC, relevance DESC
             LIMIT ?`
          : `SELECT * FROM (
               SELECT *, ROW_NUMBER() OVER (
                 PARTITION BY company_id ORDER BY fit_score DESC, relevance DESC
               ) AS rn
               FROM jobs WHERE fit_score>=?
             ) t WHERE rn<=5
             ORDER BY fit_score DESC, relevance DESC
             LIMIT ?`,
      )
      .all(
        ...(opts.status ? [opts.status, minFit, fetchN] : [minFit, fetchN]),
      ) as Array<JobRow & { rn?: number }>

    const filtered = filterRows(perCompany)
    const seen = new Set<string>()
    const onePer: JobRow[] = []
    for (const r of filtered) {
      if (seen.has(r.company_id)) continue
      seen.add(r.company_id)
      onePer.push(r)
    }
    const fresh = onePer.filter((r) => !busy.has(r.company_id))
    const used = onePer.filter((r) => busy.has(r.company_id))
    return [...fresh, ...used].slice(0, limit)
  }

  const fetchLimit = fullTimeOnly || usOnly ? Math.max(limit * 10, 100) : limit
  let rows: JobRow[]
  if (opts.status) {
    rows = conn
      .prepare(
        `SELECT * FROM jobs WHERE status=? AND fit_score>=? ORDER BY fit_score DESC, relevance DESC LIMIT ?`,
      )
      .all(opts.status, minFit, fetchLimit) as JobRow[]
  } else {
    rows = conn
      .prepare(
        `SELECT * FROM jobs WHERE fit_score>=? ORDER BY fit_score DESC, relevance DESC LIMIT ?`,
      )
      .all(minFit, fetchLimit) as JobRow[]
  }
  return filterRows(rows).slice(0, limit)
}

export function listCompanies(): CompanyRow[] {
  return getDb()
    .prepare(`SELECT * FROM companies ORDER BY name`)
    .all() as CompanyRow[]
}

export function companyStats(): Array<{
  id: string
  name: string
  ats: string | null
  queued: number
  submitted: number
  waiting: number
  manual: number
  failed: number
  discovered: number
  total: number
}> {
  return getDb()
    .prepare(
      `SELECT c.id, c.name, c.ats,
         SUM(CASE WHEN j.status='queued' THEN 1 ELSE 0 END) AS queued,
         SUM(CASE WHEN j.status='submitted' THEN 1 ELSE 0 END) AS submitted,
         SUM(CASE WHEN j.status='waiting-on-you' THEN 1 ELSE 0 END) AS waiting,
         SUM(CASE WHEN j.status='manual-apply' THEN 1 ELSE 0 END) AS manual,
         SUM(CASE WHEN j.status='failed' THEN 1 ELSE 0 END) AS failed,
         SUM(CASE WHEN j.status='discovered' THEN 1 ELSE 0 END) AS discovered,
         COUNT(j.id) AS total
       FROM companies c
       LEFT JOIN jobs j ON j.company_id=c.id
       GROUP BY c.id
       ORDER BY queued DESC, total DESC`,
    )
    .all() as Array<{
    id: string
    name: string
    ats: string | null
    queued: number
    submitted: number
    waiting: number
    manual: number
    failed: number
    discovered: number
    total: number
  }>
}

export function jobStats(): Record<string, number> {
  const rows = getDb()
    .prepare(`SELECT status, COUNT(*) as n FROM jobs GROUP BY status`)
    .all() as Array<{ status: string; n: number }>
  const out: Record<string, number> = {}
  for (const r of rows) out[r.status] = Number(r.n)
  return out
}

export function dashboardPayload() {
  return {
    stats: jobStats(),
    companies: companyStats(),
    jobs: queryJobs({ limit: 200, usOnly: false, fullTimeOnly: false, minFit: 0 }),
    gaps: listGaps({ limit: 150 }),
    generatedAt: new Date().toISOString(),
  }
}
