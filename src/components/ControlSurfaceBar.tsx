import { useMemo, useState } from 'react'
import type { ControlSurface, SkillGraph, Venture } from '../types'
import { useOrchestrator } from '../context/OrchestratorContext'
import { useShareMode } from '../hooks/useShareMode'
import { formatProgress } from '../lib/progress'
import { triggerSync } from '../lib/orchestratorApi'

type Props = {
  controlSurface: ControlSurface | null
  skillGraph: SkillGraph | null
  ventures: Venture[]
  lastSyncAt?: string | null
  onSynced?: () => Promise<void> | void
}

export function ControlSurfaceBar({
  controlSurface,
  skillGraph,
  ventures,
  lastSyncAt,
  onSynced,
}: Props) {
  const { setMainTab, openVenture, focusGraphNode, setPaletteOpen } = useOrchestrator()
  const shareMode = useShareMode()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const summary = controlSurface?.summary
  const fsm = controlSurface?.fsm
  const syncLabel = lastSyncAt
    ? new Date(lastSyncAt).toLocaleString()
    : controlSurface?.synced_at
      ? new Date(controlSurface.synced_at).toLocaleString()
      : 'never'

  const p0 = useMemo(
    () => ventures.filter((v) => v.status === 'active' && v.priority === 'P0'),
    [ventures],
  )

  const missingSkills = summary?.agents_without_skills?.length
    ? summary.agents_without_skills.join(', ')
    : null

  const capabilityLabels = useMemo(() => {
    const nodes = controlSurface?.graph?.nodes ?? []
    const labels = nodes
      .filter((n) => n.type === 'capability')
      .map((n) => n.label)
      .filter(Boolean)
    return [...new Set(labels)].slice(0, 16)
  }, [controlSurface])

  const onboarding = controlSurface?.onboarding

  async function runSync() {
    if (shareMode || busy) return
    setBusy(true)
    setMsg('Syncing…')
    try {
      const out = await triggerSync()
      setMsg(out.ok ? 'Sync complete — surface refreshed' : out.stderr ?? out.output ?? 'Sync failed')
      await onSynced?.()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Sync failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="panel control-surface-bar">
      <header className="panel-head row-between">
        <div>
          <h2>Virtual control</h2>
          <p className="muted">
            One surface for fleet · phases · skills. Synced {syncLabel}
            {fsm ? ` · FSM ${fsm.state}` : ''}
          </p>
        </div>
        <div className="fleet-actions">
          {!shareMode ? (
            <button
              type="button"
              className="btn primary"
              disabled={busy}
              onClick={() => void runSync()}
            >
              {busy ? 'Syncing…' : 'Sync Kingdom'}
            </button>
          ) : null}
          <button type="button" className="btn" onClick={() => setPaletteOpen(true)}>
            ⌘K
          </button>
          <button type="button" className="btn" onClick={() => setMainTab('graph')}>
            Graph
          </button>
          <button type="button" className="btn" onClick={() => setMainTab('research')}>
            Research
          </button>
        </div>
      </header>

      <div className="control-surface-metrics">
        <div className="stat-block">
          <span className="stat-k">Active</span>
          <span className="stat-v">
            {summary?.ventures_active ?? ventures.filter((v) => v.status === 'active').length}
          </span>
        </div>
        <div className="stat-block">
          <span className="stat-k">P0</span>
          <span className="stat-v">{summary?.ventures_p0 ?? p0.length}</span>
        </div>
        <div className="stat-block">
          <span className="stat-k">Skills</span>
          <span className="stat-v">
            {summary?.skills ?? skillGraph?.skills?.length ?? 0}
          </span>
        </div>
        <div className="stat-block">
          <span className="stat-k">Dashboards</span>
          <span className="stat-v">{summary?.dashboards_configured ?? '—'}</span>
        </div>
        <div className="stat-block">
          <span className="stat-k">Capabilities</span>
          <span className="stat-v">{summary?.capabilities ?? capabilityLabels.length}</span>
        </div>
      </div>

      {capabilityLabels.length ? (
        <div className="control-surface-caps" aria-label="Fleet capabilities">
          {capabilityLabels.map((cap) => (
            <span key={cap} className="control-cap-chip">
              {cap}
            </span>
          ))}
        </div>
      ) : null}

      {onboarding?.has_template ? (
        <p className="control-surface-onboard muted tiny">
          Onboard next venture:{' '}
          <code>{onboarding.template}</code>
          {' · '}
          <code>npm run venture:new -- --id … --repo … --agent …</code>
          {' · '}
          wiki <code>{onboarding.wiki}</code>
        </p>
      ) : null}

      {p0.length ? (
        <ul className="control-surface-p0">
          {p0.map((v) => (
            <li key={v.id}>
              <button
                type="button"
                className="btn tiny-btn"
                onClick={() => openVenture(v.id, 'run')}
              >
                Open {v.name}
              </button>
              <button
                type="button"
                className="btn tiny-btn ghost"
                onClick={() => focusGraphNode(`venture:${v.id}`)}
              >
                Focus graph
              </button>
              <span className="muted tiny">
                {formatProgress(v.progress)} · {v.nextMilestone}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {missingSkills ? (
        <p className="muted tiny">
          Agents missing skill edges: <code>{missingSkills}</code> — fixed on next sync after
          skill-graph map update.
        </p>
      ) : null}
      {msg ? <p className="muted tiny">{msg}</p> : null}
    </section>
  )
}
