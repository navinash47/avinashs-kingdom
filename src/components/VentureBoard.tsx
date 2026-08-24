import { useEffect, useMemo, useState } from 'react'
import type { Agent, Venture } from '../types'
import { ProgressDial } from './ProgressDial'
import { SegmentedControl } from './SegmentedControl'

type Props = {
  ventures: Venture[]
  agents: Agent[]
  focusId?: string | null
  onUpdate: (id: string, patch: Partial<Venture>) => void
}

export function VentureBoard({ ventures, agents, focusId, onUpdate }: Props) {
  const [filter, setFilter] = useState('active')

  useEffect(() => {
    if (focusId) setFilter('all')
  }, [focusId])

  const agentMap = useMemo(() => {
    const m = new Map<string, Agent>()
    agents.forEach((a) => m.set(a.id, a))
    return m
  }, [agents])

  const visible = ventures.filter((v) => {
    if (focusId && v.id === focusId) return true
    if (filter === 'all') return true
    if (filter === 'p0') return v.priority === 'P0'
    if (filter === 'parked') return v.status === 'parked'
    return v.status === 'active'
  })

  return (
    <section className="panel">
      <header className="panel-head row-between">
        <div>
          <h2>Venture board</h2>
          <p className="muted">Versions, progress, agents, next milestones</p>
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

      <div className="venture-grid">
        {visible.map((v) => {
          const agent = v.agentId ? agentMap.get(v.agentId) : null
          return (
            <article
              key={v.id}
              className={`venture-card pri-${v.priority}${v.id === focusId ? ' focus' : ''}`}
            >
              <div className="venture-top">
                <ProgressDial value={v.progress} />
                <div>
                  <div className="venture-badges">
                    <span className="badge">{v.priority}</span>
                    <span className="badge ghost">{v.version}</span>
                    <span className="badge ghost">{v.weight}%</span>
                  </div>
                  <h3>{v.name}</h3>
                  <p className="muted tiny">{agent ? agent.name : 'No agent'}</p>
                </div>
              </div>

              <p className="milestone">
                <span>Next</span> {v.nextMilestone}
              </p>
              {v.repoPath ? (
                <p className="path mono">{v.repoPath}</p>
              ) : (
                <p className="path mono muted">No repo</p>
              )}

              <div className="venture-controls">
                <label>
                  Progress
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={v.progress}
                    onChange={(e) =>
                      onUpdate(v.id, { progress: Number(e.target.value) })
                    }
                  />
                </label>
                <div className="pri-toggles">
                  {(['P0', 'P1', 'P2', 'parked'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={v.priority === p ? 'chip active' : 'chip'}
                      onClick={() =>
                        onUpdate(v.id, {
                          priority: p,
                          status: p === 'parked' ? 'parked' : 'active',
                        })
                      }
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
