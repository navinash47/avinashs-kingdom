import { useMemo, useState } from 'react'
import type { Agent, CicdSnapshot, Venture } from '../types'
import { ProgressDial } from './ProgressDial'
import { SegmentedControl } from './SegmentedControl'
import { useOrchestrator } from '../context/OrchestratorContext'

type Props = {
  ventures: Venture[]
  agents: Agent[]
  cicd?: Record<string, CicdSnapshot>
}

function ciDotClass(conclusion: string | null | undefined) {
  if (conclusion === 'success') return 'ci-ok'
  if (conclusion === 'failure') return 'ci-fail'
  return 'ci-none'
}

export function VentureBoard({ ventures, agents, cicd = {} }: Props) {
  const [filter, setFilter] = useState('active')
  const { selectedVentureId, openInspector } = useOrchestrator()

  const agentMap = useMemo(() => {
    const m = new Map<string, Agent>()
    agents.forEach((a) => m.set(a.id, a))
    return m
  }, [agents])

  const visible = ventures.filter((v) => {
    if (filter === 'all') return true
    if (filter === 'p0') return v.priority === 'P0'
    if (filter === 'parked') return v.status === 'parked'
    return v.status === 'active'
  })

  return (
    <section className="panel venture-board-panel">
      <header className="panel-head row-between">
        <div>
          <h2>Venture board</h2>
          <p className="muted">
            Click a venture for the inspector · <kbd>⌘K</kbd> command palette
          </p>
        </div>
        <SegmentedControl
          value={filter}
          onChange={setFilter}
          options={[
            { id: 'active', label: 'Active' },
            { id: 'p0', label: 'P0 only' },
            { id: 'parked', label: 'Parked' },
            { id: 'all', label: 'All' },
          ]}
        />
      </header>

      <div className="venture-grid compact">
        {visible.map((v) => {
          const agent = v.agentId ? agentMap.get(v.agentId) : null
          const phaseLabel =
            v.phasesPassed != null && v.phasesTotal != null
              ? `${v.phasesPassed}/${v.phasesTotal}`
              : null
          const selected = selectedVentureId === v.id
          const conclusion =
            cicd[v.id]?.github?.last_conclusion ??
            cicd[v.id]?.github?.runs?.[0]?.conclusion
          return (
            <article
              key={v.id}
              className={`venture-card pri-${v.priority}${selected ? ' selected' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => openInspector(v.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  openInspector(v.id)
                }
              }}
            >
              <div className="venture-top">
                <ProgressDial value={v.progress} size={72} />
                <div>
                  <div className="venture-badges">
                    <span className="badge">{v.priority}</span>
                    <span className="badge ghost">{v.version}</span>
                    {cicd[v.id]?.github ? (
                      <span
                        className={`ci-dot ${ciDotClass(conclusion)}`}
                        title={conclusion ?? 'no CI runs'}
                      />
                    ) : null}
                  </div>
                  <h3>{v.name}</h3>
                  <p className="muted tiny">{agent ? agent.name : 'No agent'}</p>
                </div>
              </div>
              <p className="milestone">
                <span>Next</span> {v.nextMilestone.slice(0, 80)}
                {v.nextMilestone.length > 80 ? '…' : ''}
              </p>
              {phaseLabel ? (
                <p className="muted tiny">
                  Phases <strong>{phaseLabel}</strong>
                </p>
              ) : null}
            </article>
          )
        })}
      </div>
    </section>
  )
}
