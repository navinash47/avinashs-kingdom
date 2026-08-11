import type { KingdomState } from '../types'

type Props = {
  state: KingdomState
  expenseUsd: number
  tokenBurn: number
}

export function ThroneOverview({ state, expenseUsd, tokenBurn }: Props) {
  const { portfolio } = state
  const burn = expenseUsd + tokenBurn
  const budget = portfolio.monthlyBudgetUsd
  const burnPct = Math.min(100, Math.round((burn / budget) * 100))

  return (
    <section className="panel throne">
      <header className="panel-head">
        <h2>Throne overview</h2>
        <p className="muted">{portfolio.month} · portfolio allocation + burn</p>
      </header>

      <div className="throne-grid">
        <div className="alloc">
          {portfolio.weights
            .filter((w) => w.weight > 0)
            .map((w) => (
              <div key={w.ventureId} className="alloc-row">
                <div className="alloc-meta">
                  <span>{w.label}</span>
                  <strong>{w.weight}%</strong>
                </div>
                <div className="alloc-bar">
                  <div style={{ width: `${w.weight}%` }} />
                </div>
              </div>
            ))}
        </div>

        <div className="throne-side">
          <div className="stat-block">
            <span className="stat-k">Monthly budget</span>
            <span className="stat-v">${budget}</span>
          </div>
          <div className="stat-block">
            <span className="stat-k">Tracked burn</span>
            <span className="stat-v">${burn.toFixed(0)}</span>
          </div>
          <div className="burn-meter">
            <div className="burn-fill" style={{ width: `${burnPct}%` }} />
          </div>
          <p className="muted tiny">{burnPct}% of budget used (expenses + tokens)</p>

          <h3 className="subhead">Weekly focus</h3>
          <ul className="focus-list">
            {portfolio.weeklyFocus.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
