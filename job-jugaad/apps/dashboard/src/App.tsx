import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import './app.css'

type Track = {
  id: string
  label: string
  keywords: string[]
  filePath: string
}

type Job = {
  id: string
  company_id: string
  title: string
  url: string
  location: string | null
  status: string
  fit_score: number
  resume_track: string | null
  ats: string | null
  error: string | null
  updated_at?: string
}

type CompanyStat = {
  id: string
  name: string
  ats: string | null
  queued: number
  submitted: number
  waiting: number
  failed: number
  discovered: number
  total: number
}

type Gap = {
  id: number
  company: string
  role: string
  gap: string
  why: string | null
  learn_next: string | null
  chosen_resume: string | null
  created_at: string
}

type Payload = {
  tracks: Track[]
  stats: Record<string, number>
  companies: CompanyStat[]
  jobs: Job[]
  gaps: Gap[]
  generatedAt?: string
}

type Tab = 'jobs' | 'companies' | 'gaps'

const STATUS_CLASS: Record<string, string> = {
  queued: 'st-queued',
  discovered: 'st-queued',
  'gap-only': 'st-gap',
  filling: 'st-fill',
  'waiting-on-you': 'st-wait',
  'manual-apply': 'st-wait',
  submitted: 'st-ok',
  failed: 'st-fail',
}

const EMPTY: Payload = {
  tracks: [],
  stats: {},
  companies: [],
  jobs: [],
  gaps: [],
}

export function App() {
  const [data, setData] = useState<Payload>(EMPTY)
  const [tab, setTab] = useState<Tab>('jobs')
  const [status, setStatus] = useState('all')
  const [company, setCompany] = useState('all')
  const [q, setQ] = useState('')
  const [usOnly, setUsOnly] = useState(true)
  const [ftOnly, setFtOnly] = useState(true)
  const deferredQ = useDeferredValue(q)

  async function load() {
    try {
      const r = await fetch('/api/state')
      const j = await r.json()
      setData({
        tracks: j.tracks || [],
        stats: j.stats || {},
        companies: j.companies || [],
        jobs: j.jobs || [],
        gaps: j.gaps || [],
        generatedAt: j.generatedAt,
      })
    } catch {
      setData(EMPTY)
    }
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 12_000)
    return () => clearInterval(t)
  }, [])

  const filteredJobs = useMemo(() => {
    const needle = deferredQ.trim().toLowerCase()
    return data.jobs.filter((j) => {
      if (status !== 'all' && j.status !== status) return false
      if (company !== 'all' && j.company_id !== company) return false
      if (needle) {
        const blob = `${j.title} ${j.company_id} ${j.location || ''} ${j.url}`.toLowerCase()
        if (!blob.includes(needle)) return false
      }
      if (usOnly) {
        const loc = `${j.location || ''} ${j.title}`.toLowerCase()
        if (
          /\b(brazil|brasil|s[aã]o paulo|latam|toronto|london|india|bangalore|europe|remote\s*[-:]?\s*(emea|latam|apac))\b/.test(
            loc,
          )
        ) {
          return false
        }
      }
      if (ftOnly) {
        if (/\b(intern|internship|co-op|part[-\s]?time)\b/i.test(j.title)) return false
      }
      return true
    })
  }, [data.jobs, status, company, deferredQ, usOnly, ftOnly])

  const filteredGaps = useMemo(() => {
    const needle = deferredQ.trim().toLowerCase()
    return data.gaps.filter((g) => {
      if (company !== 'all' && g.company !== company) return false
      if (!needle) return true
      return `${g.company} ${g.role} ${g.gap} ${g.why || ''} ${g.learn_next || ''}`
        .toLowerCase()
        .includes(needle)
    })
  }, [data.gaps, company, deferredQ])

  const filteredCompanies = useMemo(() => {
    const needle = deferredQ.trim().toLowerCase()
    return data.companies.filter((c) => {
      if (!needle) return true
      return `${c.name} ${c.id} ${c.ats || ''}`.toLowerCase().includes(needle)
    })
  }, [data.companies, deferredQ])

  const totalJobs = Object.values(data.stats).reduce((a, b) => a + b, 0)
  const waitingCount = data.stats['waiting-on-you'] || 0
  const manualCount = data.stats['manual-apply'] || 0

  return (
    <div className="shell wide">
      <header className="hero compact">
        <p className="eyebrow">Kingdom · Agent Jugaad</p>
        <h1>Job Jugaad</h1>
        <p className="lede">
          Track every company and job link. Apply US full-time only — never the
          same URL twice. After 3 auto attempts, links move to manual-apply.
        </p>
        <div className="cta-row">
          <button className="btn primary" type="button" onClick={load}>
            Refresh
          </button>
          <a className="btn ghost" href="/gaps.xlsx" download>
            Gaps Excel
          </a>
        </div>
        {(waitingCount > 0 || manualCount > 0) && (
          <div className="wait-banner" role="status">
            <strong>
              {manualCount > 0
                ? `${manualCount} manual-apply`
                : `${waitingCount} waiting`}
              {manualCount > 0 && waitingCount > 0
                ? ` · ${waitingCount} waiting`
                : ''}
            </strong>
            <span>
              Cloudflare / CAPTCHA — check the 15‑min digest email and apply
              those links yourself. Agent keeps crawling LinkedIn + Firecrawl.
            </span>
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                setStatus(manualCount > 0 ? 'manual-apply' : 'waiting-on-you')
                setTab('jobs')
              }}
            >
              Show links
            </button>
          </div>
        )}
        <div className="stat-strip" aria-label="Pipeline stats">
          <span>
            <strong>{totalJobs}</strong> jobs
          </span>
          <span>
            <strong>{data.stats.queued || 0}</strong> queued
          </span>
          <span>
            <strong>{data.stats.submitted || 0}</strong> submitted
          </span>
          <span>
            <strong>{waitingCount}</strong> waiting
          </span>
          <span>
            <strong>{data.gaps.length}</strong> gaps
          </span>
          <span>
            <strong>{data.companies.length}</strong> companies
          </span>
        </div>
      </header>

      <nav className="tabs" aria-label="Tracking views">
        {(
          [
            ['jobs', 'Jobs'],
            ['companies', 'Companies'],
            ['gaps', 'Gaps'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={tab === id ? 'tab on' : 'tab'}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      <section className="band filters" aria-label="Filters">
        <div className="filter-row">
          <label>
            Search
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="title, company, location…"
            />
          </label>
          <label>
            Status
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">All</option>
              {[
                'queued',
                'discovered',
                'filling',
                'waiting-on-you',
                'manual-apply',
                'submitted',
                'failed',
              ].map((s) => (
                <option key={s} value={s}>
                  {s} ({data.stats[s] || 0})
                </option>
              ))}
            </select>
          </label>
          <label>
            Company
            <select value={company} onChange={(e) => setCompany(e.target.value)}>
              <option value="all">All</option>
              {data.companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.total})
                </option>
              ))}
            </select>
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={usOnly}
              onChange={(e) => setUsOnly(e.target.checked)}
            />
            US only
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={ftOnly}
              onChange={(e) => setFtOnly(e.target.checked)}
            />
            Full-time
          </label>
        </div>
        <p className="sub tiny">
          SQLite live · {data.generatedAt ? `synced ${data.generatedAt}` : '—'} ·
          Brazil / LatAm / non-US filtered when US only is on
        </p>
      </section>

      {tab === 'jobs' && (
        <section className="band" aria-label="Jobs">
          <h2>Jobs</h2>
          <p className="sub">
            Showing {filteredJobs.length} of {data.jobs.length} loaded rows
          </p>
          <div className="table-wrap">
            <table className="grid">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Role</th>
                  <th>Loc</th>
                  <th>Fit</th>
                  <th>Resume</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map((j) => (
                  <tr key={j.id}>
                    <td>{j.company_id}</td>
                    <td>
                      <a href={j.url} target="_blank" rel="noreferrer">
                        {j.title}
                      </a>
                      {j.error && <div className="err">{j.error}</div>}
                    </td>
                    <td className="muted">{j.location || '—'}</td>
                    <td>{Math.round(j.fit_score)}</td>
                    <td className="muted">{j.resume_track || '—'}</td>
                    <td>
                      <span className={`pill ${STATUS_CLASS[j.status] || ''}`}>
                        {j.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filteredJobs.length && <p className="empty">No jobs match filters.</p>}
          </div>
        </section>
      )}

      {tab === 'companies' && (
        <section className="band" aria-label="Companies">
          <h2>Companies</h2>
          <p className="sub">Pipeline counts per company from SQLite.</p>
          <div className="table-wrap">
            <table className="grid">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>ATS</th>
                  <th>Queued</th>
                  <th>Submitted</th>
                  <th>Waiting</th>
                  <th>Failed</th>
                  <th>Discovered</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {filteredCompanies.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <button
                        type="button"
                        className="linkish"
                        onClick={() => {
                          setCompany(c.id)
                          setTab('jobs')
                        }}
                      >
                        {c.name}
                      </button>
                    </td>
                    <td className="muted">{c.ats || '—'}</td>
                    <td>{c.queued}</td>
                    <td>{c.submitted}</td>
                    <td>{c.waiting}</td>
                    <td>{c.failed}</td>
                    <td>{c.discovered}</td>
                    <td>{c.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'gaps' && (
        <section className="band" aria-label="Gaps">
          <h2>Gaps to care about</h2>
          <p className="sub">
            Skill / apply failures stored in SQLite (+ Excel export).
          </p>
          <div className="queue">
            {filteredGaps.map((g) => (
              <article key={g.id} className="row">
                <div>
                  <h3>
                    {g.company} — {g.role}
                  </h3>
                  <p>
                    <strong>{g.gap}</strong>
                    {g.why ? ` · ${g.why}` : ''}
                  </p>
                  {g.learn_next && <p className="learn">Next: {g.learn_next}</p>}
                </div>
                <span className="pill st-gap">{g.chosen_resume || 'gap'}</span>
              </article>
            ))}
            {!filteredGaps.length && (
              <p className="empty">No gaps yet — failures will land here.</p>
            )}
          </div>
        </section>
      )}

      <section className="band" aria-label="Resume library">
        <h2>Resume library</h2>
        <p className="sub">Read-only tracks — Job Jugaad never edits these files.</p>
        <ul className="tracks">
          {data.tracks.map((t) => (
            <li key={t.id}>
              <strong>{t.label}</strong>
              <span>{t.id}</span>
              <code>{t.filePath}</code>
            </li>
          ))}
          {!data.tracks.length && (
            <li className="empty">Run `npm run index:resumes`</li>
          )}
        </ul>
      </section>

      <footer>
        Secrets stay memory-only. Duplicate job URLs are blocked at apply time.
      </footer>
    </div>
  )
}
