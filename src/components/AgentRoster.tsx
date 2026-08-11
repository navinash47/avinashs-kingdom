import type { Agent, Venture } from '../types'

type Props = {
  agents: Agent[]
  ventures: Venture[]
  onBudget: (id: string, tokenBudgetUsd: number) => void
}

export function AgentRoster({ agents, ventures, onBudget }: Props) {
  const ventureName = (id: string) =>
    ventures.find((v) => v.id === id)?.name ?? id

  return (
    <section className="panel">
      <header className="panel-head">
        <h2>Agent roster</h2>
        <p className="muted">One agent per venture · token budget knobs</p>
      </header>

      <div className="agent-grid">
        {agents.map((a) => {
          const usedPct = Math.min(
            100,
            Math.round((a.tokenUsedUsd / Math.max(a.tokenBudgetUsd, 1)) * 100),
          )
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
                Used ${a.tokenUsedUsd.toFixed(2)} · {usedPct}% of budget
              </p>
            </article>
          )
        })}
      </div>
    </section>
  )
}
