import { useEffect, useState } from 'react'
import type { PortfolioRepo, ResumeKnowledge } from '../types'
import {
  approveLinkedIn,
  fetchServiceLogs,
  runFinishResume,
  startService,
  type ServiceStatus,
} from '../lib/orchestratorApi'

const DASHBOARD = 'http://127.0.0.1:5199'

function dashboardAllResumesUrl(dashboardUrl?: string) {
  const base = (dashboardUrl ?? DASHBOARD).replace(/\/$/, '')
  return `${base}/all-resumes`
}

type LinkedInDraft = {
  updated?: string
  status?: string
  approved_at?: string
  kingdom_approve_note?: string
  headline_options?: string[]
  about_variants?: string[]
  notes?: string[]
}

function linkedInIsApproved(status?: string): boolean {
  return !!status && /^APPROVED/i.test(status)
}

type Props = {
  data: ResumeKnowledge | null
  portfolio?: PortfolioRepo | null
}

export function ResumeKnowledgePanel({ data, portfolio: portfolioProp }: Props) {
  const [portfolio, setPortfolio] = useState<PortfolioRepo | null>(portfolioProp ?? null)
  const [liveOk, setLiveOk] = useState(false)
  const [ratedLive, setRatedLive] = useState(0)
  const [service, setService] = useState<ServiceStatus | null>(null)
  const [starting, setStarting] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [startHint, setStartHint] = useState<string | null>(null)
  const [finishHint, setFinishHint] = useState<string | null>(null)
  const [linkedin, setLinkedin] = useState<LinkedInDraft | null>(null)
  const [approving, setApproving] = useState(false)
  const [approveHint, setApproveHint] = useState<string | null>(null)

  async function loadLinkedInDraft() {
    try {
      const r = await fetch('/data/linkedin-draft.json')
      if (r.ok) setLinkedin((await r.json()) as LinkedInDraft)
    } catch {
      setLinkedin(null)
    }
  }

  useEffect(() => {
    void loadLinkedInDraft()
  }, [])

  useEffect(() => {
    if (portfolioProp) setPortfolio(portfolioProp)
    else {
      void fetch('/data/portfolio-repo.json')
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => setPortfolio(j as PortfolioRepo | null))
        .catch(() => setPortfolio(null))
    }
  }, [portfolioProp])

  useEffect(() => {
    async function ping() {
      try {
        const res = await fetch(`${DASHBOARD}/api/ratings`)
        if (!res.ok) return
        const json = (await res.json()) as { ratings?: Record<string, Record<string, number>> }
        const ratings = json.ratings ?? {}
        const rated = Object.values(ratings).filter((r) =>
          Object.values(r).some((v) => v > 0),
        ).length
        setRatedLive(rated)
        setLiveOk(true)
      } catch {
        setLiveOk(false)
      }
    }
    async function pollService() {
      try {
        const res = await fetch('/api/services/resume')
        if (!res.ok) return
        setService((await res.json()) as ServiceStatus)
      } catch {
        setService(null)
      }
    }
    void ping()
    void pollService()
    const t = window.setInterval(() => {
      void ping()
      void pollService()
    }, 15000)
    return () => window.clearInterval(t)
  }, [])

  async function handleStart() {
    setStarting(true)
    setStartHint(null)
    try {
      const result = await startService('resume')
      setService(result.service)
      if (result.service.status === 'up') {
        setLiveOk(true)
        setStartHint('Dashboard started — open Review or All Resumes below.')
      } else {
        setStartHint(result.output ?? 'Start finished but port still down — check log.')
      }
    } catch (e) {
      setStartHint(
        e instanceof Error
          ? e.message
          : 'Start failed — run npm run dev (orchestrator API) or cd ~/Projects/resume && npm run dashboard',
      )
    } finally {
      setStarting(false)
    }
  }

  async function showLog() {
    try {
      const log = await fetchServiceLogs('resume', 60)
      setStartHint(log || 'No log yet.')
    } catch {
      setStartHint('Could not read service log — is npm run dev running?')
    }
  }

  async function handleApproveLinkedIn() {
    if (!exportReady) {
      setApproveHint('Rate bullets and run finish pipeline before approving LinkedIn drafts.')
      return
    }
    if (linkedInIsApproved(linkedin?.status)) {
      setApproveHint('LinkedIn draft already APPROVED — update LinkedIn profile manually.')
      return
    }
    if (
      !window.confirm(
        'Approve LinkedIn headline/about drafts for posting? Featured links still follow featured-verdict.md.',
      )
    ) {
      return
    }
    setApproving(true)
    setApproveHint(null)
    try {
      const result = await approveLinkedIn()
      setApproveHint(result.output ?? (result.ok ? 'LinkedIn draft APPROVED.' : result.error ?? 'Failed'))
      if (result.ok) {
        await loadLinkedInDraft()
        window.location.reload()
      }
    } catch (e) {
      setApproveHint(
        e instanceof Error
          ? e.message
          : 'Approve failed — run npm run dev (orchestrator) or edit knowledge/linkedin.json manually',
      )
    } finally {
      setApproving(false)
    }
  }

  async function handleFinishResume() {
    if (!exportReady) {
      setFinishHint(
        `${ratedOverall}/${total} rated — rate at least one bullet and Sync to disk before finish pipeline.`,
      )
      return
    }
    setFinishing(true)
    setFinishHint(null)
    try {
      const result = await runFinishResume()
      setFinishHint(result.output ?? (result.ok ? 'Finish pipeline complete.' : result.error ?? 'Failed'))
      if (result.ok) window.location.reload()
    } catch (e) {
      setFinishHint(
        e instanceof Error
          ? e.message
          : 'Finish failed — run cd ~/Projects/resume && npm run finish:resume',
      )
    } finally {
      setFinishing(false)
    }
  }

  if (!data) {
    return (
      <section className="panel">
        <header className="panel-head">
          <h2>Resume knowledge</h2>
          <p className="muted">Run npm run sync — missing public/data/resume-knowledge.json</p>
        </header>
      </section>
    )
  }

  const total = data.bullet_counts.total ?? 0
  const ratedDisk = data.ratings_stats?.rated_overall ?? 0
  const unratedDisk = data.ratings_stats?.unrated_overall ?? Math.max(0, total - ratedDisk)
  const ratedOverall = liveOk ? ratedLive : ratedDisk
  const perRole = data.ratings_stats?.per_role ?? {}
  const pct = total ? Math.round((ratedOverall / total) * 100) : 0
  const exportReady = ratedOverall > 0
  const unsyncedLive = liveOk && ratedLive > ratedDisk
  const allResumesUrl = dashboardAllResumesUrl(data.dashboard_url)
  const previewFolderPath = `${(data.local_path ?? '~/Projects/resume').replace(/^~/, '/Users/avinashnandyala')}/tracks/preview-pdf/`
  const previewFolderUrl = `file://${previewFolderPath}`
  const linkedInApproved = linkedInIsApproved(linkedin?.status)
  const goalBlocked = exportReady && !linkedInApproved

  return (
    <section className="panel">
      <header className="panel-head">
        <h2>Resume knowledge</h2>
        <p className="muted">
          Phase {data.phase} · {data.status.replace(/_/g, ' ')} · updated {data.updated}
          {data.dashboard_ui ? ` · ${data.dashboard_ui}` : ''}
        </p>
      </header>

      {goalBlocked ? (
        <div className="resume-blocked-banner resume-finish-three" role="status">
          <strong>3 clicks to finish</strong>
          <ol className="resume-finish-steps">
            <li>
              Compare tracks:{' '}
              <a href={allResumesUrl} target="_blank" rel="noreferrer">
                All Resumes
              </a>{' '}
              ({data.roles?.length ?? 7} previews) · PDFs:{' '}
              <code>open ~/Projects/resume/tracks/preview-pdf/</code> · pick Job Jugaad primary track(s)
            </li>
            <li>Register track(s) in Job Jugaad application defaults</li>
            <li>
              Review headline/about below → <strong>Approve LinkedIn draft</strong> → post manually (DRAFT until approved)
            </li>
          </ol>
        </div>
      ) : null}

      {exportReady && unratedDisk > 0 ? (
        <div className="resume-blocked-banner" role="status">
          <strong>
            {ratedOverall}/{total} rated — {unratedDisk} unrated → treated as 0 (excluded)
          </strong>
          <span className="muted">
            {' '}
            — export-ready. Run <code>cd ~/Projects/resume && npm run finish:resume</code> or finish pipeline below.
          </span>
        </div>
      ) : !exportReady ? (
        <div className="resume-blocked-banner" role="status">
          <strong>
            {ratedOverall}/{total} bullets rated
          </strong>
          <span className="muted">
            {' '}
            — rate bullets in dashboard, Sync, then run finish pipeline.
          </span>
        </div>
      ) : null}

      <div className="resume-progress-block" role="progressbar" aria-valuenow={ratedOverall} aria-valuemin={0} aria-valuemax={total}>
        <div className="resume-progress-meta">
          <span>Ratings progress</span>
          <strong>
            {ratedOverall} / {total} ({pct}%)
          </strong>
        </div>
        <div className="resume-progress-track">
          <div className="resume-progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {unsyncedLive ? (
        <p className="resume-unsynced-warn" role="alert">
          Dashboard has <strong>{ratedLive}</strong> rated bullets but Kingdom shows <strong>{ratedDisk}</strong> on
          disk — click <strong>Sync</strong> in the dashboard, then run{' '}
          <code>npm run sync:kingdom</code>.
        </p>
      ) : null}

      <div className="resume-knowledge-grid">
        <div className="stat-block">
          <span className="stat-k">Bullet options</span>
          <span className="stat-v">{total}</span>
        </div>
        <div className="stat-block">
          <span className="stat-k">Rated (any role)</span>
          <span className="stat-v">{ratedOverall}</span>
        </div>
        <div className="stat-block">
          <span className="stat-k">Role tracks</span>
          <span className="stat-v">{data.roles?.length ?? 7}</span>
        </div>
        <div className="stat-block">
          <span className="stat-k">Unrated (→ 0)</span>
          <span className="stat-v">{unratedDisk}</span>
        </div>
      </div>

      {Object.keys(perRole).length > 0 ? (
        <>
          <h3 className="subhead">Ratings per role</h3>
          <ul className="focus-list burn-break">
            {Object.entries(perRole).map(([id, row]) => (
              <li key={id}>
                {row.label}{row.level === 'entry' ? ' (entry)' : ''}{' '}
                <strong>
                  {row.rated}/{row.total}
                </strong>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <p className="muted tiny">
        Dashboard{' '}
        {liveOk
          ? 'live on :5199'
          : service?.status === 'up'
            ? 'port up — loading ratings…'
            : 'offline — Start below or: cd ~/Projects/resume && npm run dashboard'}
      </p>

      <div className="hero-actions" style={{ marginTop: '0.5rem' }}>
        {!liveOk ? (
          <button
            type="button"
            className="btn primary"
            disabled={starting || service?.status === 'up'}
            onClick={() => void handleStart()}
          >
            {starting ? 'Starting…' : 'Start resume dashboard'}
          </button>
        ) : (
          <a className="btn primary" href={data.dashboard_url} target="_blank" rel="noreferrer">
            Open dashboard — rate bullets
          </a>
        )}
        <a className="btn" href={allResumesUrl} target="_blank" rel="noreferrer">
          All Resumes — {data.roles?.length ?? 7} tracks
        </a>
        {data.preview_pdfs?.length ? (
          <a
            className="btn"
            href={previewFolderUrl}
            title="Opens preview-pdf folder in Finder"
          >
            Open preview PDFs folder
          </a>
        ) : (
          <span className="btn ghost muted" title="Run npm run compile:pdfs first">
            Preview PDFs (not compiled yet)
          </span>
        )}
        {!liveOk ? (
          <button type="button" className="btn ghost" onClick={() => void showLog()}>
            Show log
          </button>
        ) : null}
        <button
          type="button"
          className="btn"
          disabled={finishing || !exportReady}
          title={
            !exportReady
              ? 'Rate at least one bullet, Sync, then run finish pipeline'
              : unratedDisk > 0
                ? `${unratedDisk} unrated → 0 (excluded) — export rated bullets, compile PDFs, sync Kingdom`
                : 'Export all tracks, compile PDFs, sync Kingdom'
          }
          onClick={() => void handleFinishResume()}
        >
          {finishing ? 'Running finish…' : 'Run finish pipeline'}
        </button>
      </div>
      {startHint ? <p className="muted tiny">{startHint}</p> : null}
      {finishHint ? (
        <pre className="muted tiny resume-finish-output" style={{ whiteSpace: 'pre-wrap' }}>
          {finishHint}
        </pre>
      ) : null}

      <div className="hero-actions" style={{ marginTop: '0.75rem' }}>
        <a className="btn primary" href={allResumesUrl} target="_blank" rel="noreferrer">
          All Resumes ({data.roles?.length ?? 7} tracks)
        </a>
        <a className="btn" href={data.dashboard_url} target="_blank" rel="noreferrer">
          Role-fit dashboard
        </a>
        <a className="btn ghost" href={data.repo} target="_blank" rel="noreferrer">
          Resume repo
        </a>
        {portfolio ? (
          <>
            <a className="btn ghost" href={portfolio.site_url} target="_blank" rel="noreferrer">
              Portfolio site
            </a>
            <a className="btn ghost" href={portfolio.repo} target="_blank" rel="noreferrer">
              Portfolio repo
            </a>
          </>
        ) : null}
        <a className="btn ghost" href="/data/linkedin-draft.json" target="_blank" rel="noreferrer">
          LinkedIn drafts (JSON)
        </a>
        {data.goal_checklist ? (
          <a
            className="btn ghost"
            href={`${data.repo}/blob/main/${data.goal_checklist}`}
            target="_blank"
            rel="noreferrer"
            title={`Local: open ~/Projects/resume/${data.goal_checklist}`}
          >
            Goal checklist
          </a>
        ) : null}
        {data.role_comparison ? (
          <a
            className="btn ghost"
            href={`${data.repo}/blob/main/${data.role_comparison}`}
            target="_blank"
            rel="noreferrer"
            title={`Local: open ~/Projects/resume/${data.role_comparison}`}
          >
            Role comparison
          </a>
        ) : null}
        {data.rating_guide ? (
          <a
            className="btn ghost"
            href={`${data.repo}/blob/main/${data.rating_guide}`}
            target="_blank"
            rel="noreferrer"
            title={`Local: open ~/Projects/resume/${data.rating_guide}`}
          >
            Rating guide
          </a>
        ) : null}
      </div>
      {data.goal_checklist ? (
        <p className="muted tiny">
          Finish flow:{' '}
          <code>open ~/Projects/resume/{data.goal_checklist}</code>
          {' '}· {ratedOverall}/{total} rated — Sync after each session; do not mark goal complete until bullets + LinkedIn signed off.
        </p>
      ) : null}

      {linkedin?.headline_options?.length ? (
        <>
          <h3 className="subhead">LinkedIn drafts</h3>
          <div className="linkedin-status-row">
            <span
              className={`linkedin-status-badge ${linkedInApproved ? 'linkedin-status-approved' : 'linkedin-status-draft'}`}
            >
              {linkedInApproved ? 'APPROVED' : 'DRAFT'}
            </span>
            <span className="muted tiny">
              updated {linkedin.updated ?? '—'}
              {linkedin.approved_at ? ` · approved ${linkedin.approved_at.slice(0, 10)}` : ''}
            </span>
          </div>
          {!linkedInApproved ? (
            <div className="hero-actions" style={{ marginTop: '0.35rem' }}>
              <button
                type="button"
                className="btn primary"
                disabled={approving || !exportReady}
                title={
                  !exportReady
                    ? 'Finish bullet ratings before LinkedIn sign-off'
                    : 'Writes APPROVED to knowledge/linkedin.json and syncs Kingdom'
                }
                onClick={() => void handleApproveLinkedIn()}
              >
                {approving ? 'Approving…' : 'Approve LinkedIn draft'}
              </button>
            </div>
          ) : (
            <p className="muted tiny linkedin-approved-note">
              Signed off — safe to post headline + about to LinkedIn. Featured links per featured-verdict.md.
            </p>
          )}
          {approveHint ? (
            <pre className="muted tiny resume-finish-output" style={{ whiteSpace: 'pre-wrap' }}>
              {approveHint}
            </pre>
          ) : null}
          <p className="muted tiny">
            {linkedin.status ?? 'draft'} — review variants below before approving.
          </p>
          {linkedin.kingdom_approve_note ? (
            <p className="muted tiny">{linkedin.kingdom_approve_note}</p>
          ) : null}
          <div className="linkedin-draft-preview">
            {linkedin.headline_options.map((headline, i) => (
              <details key={headline.slice(0, 40)} className="linkedin-draft-option">
                <summary>
                  Headline {i + 1}
                  <span className="muted"> — {headline.length} chars</span>
                </summary>
                <p className="linkedin-draft-text">{headline}</p>
              </details>
            ))}
            {linkedin.about_variants?.length ? (
              <details className="linkedin-draft-option">
                <summary>
                  About variants <span className="muted">({linkedin.about_variants.length})</span>
                </summary>
                {linkedin.about_variants.map((about, i) => (
                  <div key={i} className="linkedin-about-block">
                    <p className="muted tiny">Variant {i + 1}</p>
                    <p className="linkedin-draft-text pre-wrap">{about}</p>
                  </div>
                ))}
              </details>
            ) : null}
            {linkedin.notes?.length ? (
              <ul className="focus-list muted tiny">
                {linkedin.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </>
      ) : null}

      {portfolio?.legacy_catalog ? (
        <p className="muted tiny">
          Legacy: {portfolio.legacy_catalog.tracks} tracks · {portfolio.legacy_catalog.sources} sources — dashboard{' '}
          <strong>Legacy / Archive</strong> tab
        </p>
      ) : null}

      {data.preview_pdfs?.length ? (
        <>
          <h3 className="subhead">Preview PDFs (local)</h3>
          <p className="muted tiny">
            Open in Finder:{' '}
            <code>open ~/Projects/resume/tracks/preview-pdf/</code> — preview export, not final until rated.
          </p>
          <ul className="focus-list">
            {data.preview_pdfs.map((row) => (
              <li key={row.role}>
                <strong>{row.label ?? row.role}</strong>
                <span className="muted"> · </span>
                <code>{row.path}</code>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <h3 className="subhead">Family share site</h3>
      <p className="muted tiny">
        Password-protected Vercel portal for PDF/DOCX resumes + cover letters (gf + dad). Local preview:{' '}
        <a href={data.share_site_local ?? 'http://localhost:5299'} target="_blank" rel="noreferrer">
          {data.share_site_local ?? 'http://localhost:5299'}
        </a>
        {data.share_site_url ? (
          <>
            {' '}
            · Deployed:{' '}
            <a href={data.share_site_url} target="_blank" rel="noreferrer">
              {data.share_site_url}
            </a>
          </>
        ) : (
          <span className="muted"> · Set SHARE_SITE_URL after first Vercel deploy (see share-site/README.md)</span>
        )}
      </p>

      <h3 className="subhead">Export pipeline</h3>
      {data.preview_tex_generated ? (
        <p className="muted tiny">
          Preview <code>.tex</code> ready for all {data.roles?.length ?? 7} roles in{' '}
          <code>~/Projects/resume/tracks/</code> — compile with{' '}
          <code>pdflatex track-&lt;role&gt;.tex</code> (see tracks/README.md). Re-run{' '}
          <code>npm run export</code> after you Sync ratings.
        </p>
      ) : null}
      <ol className="focus-list burn-break">
        <li>Dashboard: <strong>Review</strong> (rate per role) → Sync · <a href={allResumesUrl} target="_blank" rel="noreferrer"><strong>All Resumes</strong></a> ({data.roles?.length ?? 7} previews) · <strong>Legacy / Archive</strong></li>
        <li>
          <code>cd ~/Projects/resume && npm run export</code> — all {data.roles?.length ?? 7} role tracks
        </li>
        <li>
          <code>npm run sync:kingdom</code> — refresh this panel
        </li>
        <li>Compile PDF with TeX Live (<code>tracks/glyphtounicode.tex</code> vendored — see <code>tracks/README.md</code>)</li>
        <li>
          Compare suggestions: <code>npm run export -- --preview-suggestions --dry-run</code>
        </li>
      </ol>
      {data.eval_stats?.top_consensus?.length ? (
        <>
          <h3 className="subhead">Top eval picks (consensus)</h3>
          <ul className="focus-list">
            {data.eval_stats.top_consensus.map((row) => (
              <li key={row.id}>
                <span className="muted">{row.id}</span> <strong>{row.consensus}</strong>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <h3 className="subhead">Featured projects</h3>
      <ul className="focus-list">
        {data.featured_projects.map((p) => (
          <li key={p.id}>
            <a href={p.git} target="_blank" rel="noreferrer">{p.name}</a>
            <span className="muted"> · {p.honesty_gate}</span>
          </li>
        ))}
      </ul>
      <p className="muted tiny">
        Excluded from main tracks: {(data.excluded_projects ?? []).join(', ')}
        {data.deferred_projects?.length ? (
          <> · Deferred (optional lab bullets): {data.deferred_projects.map((p) => p.name).join(', ')}</>
        ) : null}
        {' '}— see <code>knowledge/featured-verdict.md</code>
      </p>

      <h3 className="subhead">Confirmed metrics</h3>
      <ul className="focus-list">
        {Object.entries(data.confirmed_metrics).map(([k, v]) => (
          <li key={k}>
            <span className="muted">{k.replace(/_/g, ' ')}</span> <strong>{v}</strong>
          </li>
        ))}
      </ul>

      <h3 className="subhead">Mature next (top 5)</h3>
      <ul className="focus-list">
        {data.maturity_top5.map((name) => (
          <li key={name}>{name}</li>
        ))}
      </ul>

      <h3 className="subhead">Options per section</h3>
      <ul className="focus-list burn-break">
        {Object.entries(data.bullet_counts)
          .filter(([k]) => k !== 'total')
          .map(([k, n]) => (
            <li key={k}>
              {k.replace(/_/g, ' ')} <strong>{n}</strong>
            </li>
          ))}
      </ul>
    </section>
  )
}
