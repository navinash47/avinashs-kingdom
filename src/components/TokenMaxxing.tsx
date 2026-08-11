import { useState } from 'react'
import type { Agent, TokensState, Venture } from '../types'

type Props = {
  tokens: TokensState
  ventures: Venture[]
  agents: Agent[]
  onAdd: (entry: {
    date: string
    ventureId: string
    agentId: string
    label: string
    usd: number
    tokensEst: number
  }) => void
}

export function TokenMaxxing({ tokens, ventures, agents, onAdd }: Props) {
  const burn = tokens.entries.reduce((s, e) => s + e.usd, 0)
  const pct = Math.min(100, Math.round((burn / tokens.capUsd) * 100))
  const [label, setLabel] = useState('')
  const [usd, setUsd] = useState('5')
  const [ventureId, setVentureId] = useState(ventures[0]?.id ?? '')
  const [agentId, setAgentId] = useState(agents[0]?.id ?? '')

  return (
    <section className="panel">
      <header className="panel-head">
        <h2>Token maxxing</h2>
        <p className="muted">
          Cap ${tokens.capUsd}/mo · burned ${burn.toFixed(2)} ({pct}%)
        </p>
      </header>

      <div className="burn-meter tall">
        <div className="burn-fill" style={{ width: `${pct}%` }} />
      </div>

      <div className="two-col">
        <div>
          <h3 className="subhead">Log spend</h3>
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault()
              if (!label.trim()) return
              onAdd({
                date: new Date().toISOString().slice(0, 10),
                ventureId,
                agentId,
                label: label.trim(),
                usd: Number(usd) || 0,
                tokensEst: 0,
              })
              setLabel('')
            }}
          >
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="What burned tokens?"
            />
            <div className="form-row">
              <input
                type="number"
                step="0.01"
                value={usd}
                onChange={(e) => setUsd(e.target.value)}
                placeholder="USD"
              />
              <select value={ventureId} onChange={(e) => setVentureId(e.target.value)}>
                {ventures.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
              <select value={agentId} onChange={(e) => setAgentId(e.target.value)}>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn primary">
              Add entry
            </button>
          </form>

          <ul className="ledger">
            {tokens.entries.map((e) => (
              <li key={e.id}>
                <span>{e.date}</span>
                <span>{e.label}</span>
                <strong>${e.usd.toFixed(2)}</strong>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="subhead">Save money</h3>
          <ul className="tips">
            {tokens.tips.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
