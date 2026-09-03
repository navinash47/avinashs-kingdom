import { useMemo, useState } from 'react'
import type { CicdSnapshot, Expense, Venture } from '../types'
import { useOrchestrator } from '../context/OrchestratorContext'
import { clampProgress, formatProgress } from '../lib/progress'
import { ProgressDial } from './ProgressDial'

type Props = {
  ventures: Venture[]
  expenses: Expense[]
  cicd: Record<string, CicdSnapshot>
}

type SortKey = 'progress' | 'phases' | 'spend' | 'weight' | 'name'

function phaseEffort(v: Venture): { done: number; total: number; pct: number } | null {
  if (v.phasesPassed == null || v.phasesTotal == null || v.phasesTotal <= 0) return null
  return {
    done: v.phasesPassed,
    total: v.phasesTotal,
    pct: Math.round((v.phasesPassed / v.phasesTotal) * 100),
  }
}

function fmtMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60_000).toFixed(1)}m`
}

function statusTone(status: Venture['status']): string {
  if (status === 'active') return 'ok'
  if (status === 'parked') return 'warn'
  return 'muted'
}

export function AnalyticsPanel({ ventures, expenses, cicd }: Props) {
  const { openVenture } = useOrchestrator()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sort, setSort] = useState<SortKey>('progress')

  const spendByVenture = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of expenses) {
      if (e.currency !== 'USD') continue
      map.set(e.ventureId, (map.get(e.ventureId) ?? 0) + e.amount)
    }
    return map
  }, [expenses])

  const rows = useMemo(() => {
    const list = ventures.map((v) => {
      const effort = phaseEffort(v)
      const ledger = spendByVenture.get(v.id) ?? 0
      const trackedSpend = v.spendUsd ?? ledger
      const testMs = cicd[v.id]?.local_tests?.last_run?.duration_ms ?? null
      return { v, effort, trackedSpend, ledger, testMs }
    })
    list.sort((a, b) => {
      switch (sort) {
        case 'phases':
          return (b.effort?.pct ?? -1) - (a.effort?.pct ?? -1)
        case 'spend':
          return b.trackedSpend - a.trackedSpend
        case 'weight':
          return b.v.weight - a.v.weight
        case 'name':
          return a.v.name.localeCompare(b.v.name)
        default:
          return b.v.progress - a.v.progress
      }
    })
    return list
  }, [ventures, spendByVenture, cicd, sort])

  const selected = rows.find((r) => r.v.id === selectedId) ?? null
  const maxSpend = Math.max(1, ...rows.map((r) => r.trackedSpend))
  const avgProgress =
    rows.length === 0
      ? 0
      : Math.round(rows.reduce((s, r) => s + r.v.progress, 0) / rows.length)
  const activeCount = ventures.filter((v) => v.status === 'active').length
  const withPhases = rows.filter((r) => r.effort).length

  return (
    <section className="panel analytics-panel">
      <header className="panel-head">
        <h2>Fleet analytics</h2>
        <p className="muted">
          Progress, phase effort, and spend from synced data — click a bar or row to inspect
        </p>
      </header>

      <div className="analytics-summary">
        <div className="stat-block">
          <span className="stat-k">Active ventures</span>
          <span className="stat-v">
            {activeCount}/{ventures.length}
          </span>
        </div>
        <div className="stat-block">
          <span className="stat-k">Avg progress</span>
          <span className="stat-v">{avgProgress}%</span>
        </div>
        <div className="stat-block">
          <span className="stat-k">Phase-tracked</span>
          <span className="stat-v">{withPhases}</span>
        </div>
        <ProgressDial value={avgProgress} size={72} label="fleet" />
      </div>

      <div className="analytics-toolbar">
        <span className="muted tiny">Sort</span>
        {(
          [
            ['progress', 'Progress'],
            ['phases', 'Phases'],
            ['spend', 'Spend'],
            ['weight', 'Weight'],
            ['name', 'Name'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`btn tiny${sort === key ? ' primary' : ''}`}
            onClick={() => setSort(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="analytics-charts">
        <div className="analytics-chart">
          <h3 className="subhead">Progress by project</h3>
          <ul className="analytics-bars" role="list">
            {rows.map(({ v }) => (
              <li key={`p-${v.id}`}>
                <button
                  type="button"
                  className={`analytics-bar-btn${selectedId === v.id ? ' is-selected' : ''}`}
                  onClick={() => setSelectedId(v.id === selectedId ? null : v.id)}
                  aria-pressed={selectedId === v.id}
                >
                  <span className="analytics-bar-meta">
                    <span className="analytics-bar-name">{v.name}</span>
                    <strong>{formatProgress(v.progress)}</strong>
                  </span>
                  <span className="analytics-bar-track" aria-hidden>
                    <span
                      className="analytics-bar-fill progress"
                      style={{ width: `${clampProgress(v.progress)}%` }}
                    />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="analytics-chart">
          <h3 className="subhead">Phase effort (passed / total)</h3>
          <ul className="analytics-bars" role="list">
            {rows.map(({ v, effort }) => (
              <li key={`e-${v.id}`}>
                <button
                  type="button"
                  className={`analytics-bar-btn${selectedId === v.id ? ' is-selected' : ''}`}
                  onClick={() => setSelectedId(v.id === selectedId ? null : v.id)}
                  aria-pressed={selectedId === v.id}
                  disabled={!effort}
                >
                  <span className="analytics-bar-meta">
                    <span className="analytics-bar-name">{v.name}</span>
                    <strong>
                      {effort ? `${effort.done}/${effort.total}` : '—'}
                    </strong>
                  </span>
                  <span className="analytics-bar-track" aria-hidden>
                    <span
                      className="analytics-bar-fill phases"
                      style={{ width: `${effort?.pct ?? 0}%` }}
                    />
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="muted tiny">
            Projects without phase boards show a blank bar — progress still comes from STATUS
            sync.
          </p>
        </div>

        <div className="analytics-chart">
          <h3 className="subhead">Spend signal (USD)</h3>
          <ul className="analytics-bars" role="list">
            {rows.map(({ v, trackedSpend }) => {
              const width = Math.round((trackedSpend / maxSpend) * 100)
              return (
                <li key={`s-${v.id}`}>
                  <button
                    type="button"
                    className={`analytics-bar-btn${selectedId === v.id ? ' is-selected' : ''}`}
                    onClick={() => setSelectedId(v.id === selectedId ? null : v.id)}
                    aria-pressed={selectedId === v.id}
                  >
                    <span className="analytics-bar-meta">
                      <span className="analytics-bar-name">{v.name}</span>
                      <strong>${trackedSpend.toFixed(0)}</strong>
                    </span>
                    <span className="analytics-bar-track" aria-hidden>
                      <span
                        className="analytics-bar-fill spend"
                        style={{ width: `${trackedSpend > 0 ? Math.max(4, width) : 0}%` }}
                      />
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          <p className="muted tiny">
            Uses venture spend fields when present, else ledger rows attributed to that venture.
          </p>
        </div>
      </div>

      {selected ? (
        <div className="analytics-detail panel-inner">
          <div className="analytics-detail-head">
            <div>
              <p className="eyebrow">Selected venture</p>
              <h3>{selected.v.name}</h3>
              <p className="muted">
                {selected.v.version} ·{' '}
                <span className={statusTone(selected.v.status)}>{selected.v.status}</span> ·{' '}
                {selected.v.priority}
              </p>
            </div>
            <ProgressDial value={selected.v.progress} size={80} label="done" />
          </div>
          <dl className="analytics-dl">
            <div>
              <dt>Next milestone</dt>
              <dd>{selected.v.nextMilestone || '—'}</dd>
            </div>
            <div>
              <dt>Progress source</dt>
              <dd>{selected.v.progressSource ?? 'STATUS / sync'}</dd>
            </div>
            <div>
              <dt>Phase effort</dt>
              <dd>
                {selected.effort
                  ? `${selected.effort.done} of ${selected.effort.total} phases (${selected.effort.pct}%)`
                  : 'Not phase-tracked'}
              </dd>
            </div>
            <div>
              <dt>Spend / ceiling</dt>
              <dd>
                ${selected.trackedSpend.toFixed(2)}
                {selected.v.ceilingUsd != null ? ` / $${selected.v.ceilingUsd}` : ''}
                {selected.ledger > 0 && selected.v.spendUsd == null
                  ? ' (from expenses ledger)'
                  : ''}
              </dd>
            </div>
            <div>
              <dt>Last local test time</dt>
              <dd>{selected.testMs != null ? fmtMs(selected.testMs) : 'No recent run synced'}</dd>
            </div>
            <div>
              <dt>Portfolio weight</dt>
              <dd>{selected.v.weight}%</dd>
            </div>
          </dl>
          <div className="analytics-detail-actions">
            <button
              type="button"
              className="btn primary"
              onClick={() => openVenture(selected.v.id, 'overview')}
            >
              Open venture
            </button>
            <button type="button" className="btn" onClick={() => setSelectedId(null)}>
              Clear selection
            </button>
          </div>
        </div>
      ) : (
        <p className="muted analytics-hint">
          Tip: click any bar to open a detail pane, then jump into that venture.
        </p>
      )}
    </section>
  )
}
