import { useEffect, useState } from 'react'
import type { MacAudit } from '../types'

function fmtBytes(n: number) {
  if (!n) return '—'
  const gb = n / 1e9
  if (gb >= 1) return `${gb.toFixed(1)} GB`
  return `${(n / 1e6).toFixed(0)} MB`
}

const LIVE = 'http://127.0.0.1:8742'

type Props = {
  data: MacAudit | null
}

export function MacStorageAuditPanel({ data }: Props) {
  const [live, setLive] = useState<MacAudit | null>(null)
  const [liveOk, setLiveOk] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function pingLive() {
    try {
      const res = await fetch(`${LIVE}/api/latest`)
      if (!res.ok) return
      const json = (await res.json()) as MacAudit
      setLive(json)
      setLiveOk(true)
    } catch {
      setLiveOk(false)
    }
  }

  useEffect(() => {
    void pingLive()
    const t = window.setInterval(() => void pingLive(), 12000)
    return () => window.clearInterval(t)
  }, [])

  const view = liveOk && live ? live : data
  const health = view?.health
  const mem = view?.memory
  const cpu = view?.cpu

  async function runClean(action: string) {
    if (!confirm(`Run ${action}?`)) return
    setBusy(true)
    setFlash(null)
    try {
      const res = await fetch(`${LIVE}/api/clean`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, confirm: true }),
      })
      const json = await res.json()
      if (!res.ok || json.ok === false) {
        setFlash(json.error || 'Clean failed — start the dashboard on :8742')
      } else {
        setFlash(json.detail || 'Done')
        if (json.snapshot) {
          setLive(json.snapshot)
          setLiveOk(true)
        }
      }
    } catch {
      setFlash('Dashboard not running. Start: python3 -m mac_optimize serve')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="panel">
      <header className="panel-head">
        <h2>Mac optimize audit</h2>
        <p className="muted">
          {liveOk ? 'Live from :8742' : 'Snapshot via sync'}
          {health ? ` · health ${health.grade} ${health.score}/100` : ''}
          {view?.disk?.note ? ` · ${view.disk.note}` : ''}
        </p>
      </header>

      {!view ? (
        <div className="empty">
          <p>No Mac snapshot yet. Run the audit, then sync.</p>
        </div>
      ) : (
        <>
          <div className="mac-hero">
            <div className="stat-block">
              <span className="stat-k">Health</span>
              <span className="stat-v mac-grade">{health?.grade ?? '—'}</span>
            </div>
            <div className="stat-block">
              <span className="stat-k">App + wired + compressor</span>
              <span className="stat-v">{mem?.percent_used ?? '—'}%</span>
            </div>
            <div className="stat-block">
              <span className="stat-k">Swap</span>
              <span className="stat-v">
                {mem?.swap?.used_mb != null
                  ? `${Math.round(mem.swap.used_mb)} MB`
                  : '—'}
              </span>
            </div>
            <div className="stat-block">
              <span className="stat-k">CPU load</span>
              <span className="stat-v">{cpu?.load_human ?? '—'}</span>
            </div>
          </div>
          <div className="burn-meter">
            <div
              className="burn-fill"
              style={{ width: `${Math.min(100, mem?.percent_used ?? view.disk.percent_used)}%` }}
            />
          </div>
          <p className="muted tiny">
            Pressure {mem?.pressure ?? '—'}
            {view.host?.uptime_days != null
              ? ` · up ${view.host.uptime_days} days`
              : ''}
            {health?.summary ? ` · ${health.summary}` : ''}
          </p>

          {view.app_groups && view.app_groups.length > 0 && (
            <>
              <h3 className="subhead">RAM by app</h3>
              <ul className="mac-rows">
                {view.app_groups.slice(0, 6).map((g) => (
                  <li key={g.name}>
                    <strong>{g.name}</strong>
                    <span>
                      {g.rss_human ?? fmtBytes(g.rss_bytes)} · {g.cpu.toFixed(1)}% CPU · ×
                      {g.count}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {view.top_cpu && view.top_cpu.length > 0 && (
            <>
              <h3 className="subhead">Hottest CPU</h3>
              <ul className="mac-rows">
                {view.top_cpu.slice(0, 5).map((p) => (
                  <li key={`${p.pid}-${p.name}`}>
                    <strong>
                      {p.name}{' '}
                      {p.pcpu >= 80 ? (
                        <span className="risk risk-high">runaway</span>
                      ) : null}
                    </strong>
                    <span>
                      {p.pcpu.toFixed(1)}% · {p.rss_human ?? ''}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}

          <h3 className="subhead">Fixes</h3>
          <ul className="recs">
            {(view.recommendations || []).map((r) => (
              <li key={r.title}>
                <div className="rec-top">
                  <strong>{r.title}</strong>
                  <span className={`risk risk-${r.risk}`}>{r.risk}</span>
                </div>
                <p className="muted tiny">
                  {r.bytes ? `${fmtBytes(r.bytes)} · ` : ''}
                  {r.rationale}
                </p>
              </li>
            ))}
          </ul>

          {view.cleaners && view.cleaners.length > 0 && (
            <div className="mac-cleaners">
              {view.cleaners.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="btn"
                  disabled={busy || c.available === false}
                  onClick={() => void runClean(c.id)}
                >
                  {c.title}
                </button>
              ))}
            </div>
          )}
          {flash && <p className="muted tiny">{flash}</p>}
        </>
      )}

      <div className="cmd-box">
        <p className="subhead">Live tool</p>
        <p className="muted tiny">
          Dashboard:{' '}
          <a href={view?.dashboard || LIVE} target="_blank" rel="noreferrer">
            {view?.dashboard || LIVE}
          </a>
        </p>
        <pre>{`cd ~/Projects/mac-optimize-audit
python3 -m mac_optimize audit --deep
python3 -m mac_optimize serve
# Kingdom: npm run sync`}</pre>
      </div>
    </section>
  )
}
