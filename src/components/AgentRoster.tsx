import { useMemo, useState } from 'react'
import type { Agent, SkillGraph, TokensState, Venture } from '../types'

type Props = {
  agents: Agent[]
  ventures: Venture[]
  skillGraph: SkillGraph | null
  tokens: TokensState
  onBudget: (id: string, tokenBudgetUsd: number) => void
}

export function AgentRoster({ agents, ventures, skillGraph, tokens, onBudget }: Props) {
  const [traceId, setTraceId] = useState<string | null>(null)

  const ventureName = (id: string) =>
    ventures.find((v) => v.id === id)?.name ?? id

  const tokenByAgent = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of tokens.entries) {
      map.set(e.agentId, (map.get(e.agentId) ?? 0) + e.usd)
    }
    return map
  }, [tokens.entries])

  const graphByAgent = useMemo(() => {
    const map = new Map<string, SkillGraph['agents'][0]>()
    for (const a of skillGraph?.agents ?? []) map.set(a.id, a)
    return map
  }, [skillGraph])

  const traced = traceId ? graphByAgent.get(traceId) : null
  const tracedAgent = traceId ? agents.find((a) => a.id === traceId) : null

  return (
    <section className="panel">
      <header className="panel-head">
        <h2>Agent roster</h2>
        <p className="muted">One agent per venture · token budget · trace view</p>
      </header>

      <div className="agent-grid">
        {agents.map((a) => {
          const usedPct = Math.min(
            100,
            Math.round((a.tokenUsedUsd / Math.max(a.tokenBudgetUsd, 1)) * 100),
          )
          const logSpend = tokenByAgent.get(a.id) ?? 0
          const graph = graphByAgent.get(a.id)
          return (
            <article key={a.id} className="agent-card">
              <div className="agent-head">
                <h3>{a.name}</h3>
                <span className="badge ghost">{ventureName(a.ventureId)}</span>
              </div>
              <p>{a.focus}</p>
              <label className="budget-knob">
                Token budget ${a.tokenBudgetUsd}
                <input
                  type="range"
                  min={5}
                  max={120}
                  step={5}
                  value={a.tokenBudgetUsd}
                  onChange={(e) => onBudget(a.id, Number(e.target.value))}
                />
              </label>
              <div className="burn-meter">
                <div className="burn-fill" style={{ width: `${usedPct}%` }} />
              </div>
              <p className="muted tiny">
                Used ${a.tokenUsedUsd.toFixed(2)} · log ${logSpend.toFixed(2)} · {usedPct}% of budget
              </p>
              {graph?.skills?.length ? (
                <p className="tiny">
                  Skills: {graph.skills.slice(0, 4).join(', ')}
                  {graph.skills.length > 4 ? ` +${graph.skills.length - 4}` : ''}
                </p>
              ) : null}
              <button
                type="button"
                className="btn ghost tiny trace-btn"
                onClick={() => setTraceId(traceId === a.id ? null : a.id)}
              >
                {traceId === a.id ? 'Hide trace' : 'Trace'}
              </button>
            </article>
          )
        })}
      </div>

      {traced && tracedAgent ? (
        <div className="agent-trace panel-inner">
          <h3>Trace · {tracedAgent.name}</h3>
          <div className="inspector-block">
            <h4>Skills visible</h4>
            {traced.skills.length ? (
              <ul className="dep-list">
                {traced.skills.map((s) => (
                  <li key={s}><code>{s}</code></li>
                ))}
              </ul>
            ) : (
              <p className="muted tiny">No mapped skills — run npm run sync.</p>
            )}
          </div>
          <div className="inspector-block">
            <h4>Recent observations</h4>
            {traced.recent_observations.length ? (
              <ul className="exp-list">
                {traced.recent_observations.map((o) => (
                  <li key={o.header}>
                    <span className="badge ghost">{o.at ?? o.header}</span>
                    <p className="tiny">{o.body.slice(0, 200)}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted tiny">No matching entries in skill-observations/log.md.</p>
            )}
          </div>
          <p className="muted tiny">
            Architecture: brain/wiki/architecture/{traced.venture_id}.md ·
            Experiments: brain/wiki/experiments/{traced.venture_id}.md
          </p>
        </div>
      ) : null}

      {skillGraph ? (
        <div className="panel-inner">
          <h3>Skill catalog ({skillGraph.skills.length})</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Skill</th>
                <th>SKILL.md</th>
              </tr>
            </thead>
            <tbody>
              {skillGraph.skills.map((s) => (
                <tr key={s.id}>
                  <td><code>{s.id}</code></td>
                  <td>{s.has_skill_md ? 'yes' : 'no'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  )
}
