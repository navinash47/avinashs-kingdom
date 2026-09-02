import type { CicdSnapshot, KingdomState, VentureManifest } from '../types'
import { ControlSurfaceBar } from './ControlSurfaceBar'
import { FleetStrip } from './FleetStrip'
import { WhatYouGet } from './WhatYouGet'

type Props = {
  state: KingdomState
  expenseUsd: number
  tokenBurn: number
  syncSubs: number
  syncApi: number
  manualUsd: number
  manifests: Record<string, VentureManifest>
  cicd: Record<string, CicdSnapshot>
  lastSyncAt?: string | null
  onSynced?: () => Promise<void> | void
}

export function ThroneOverview({
  state,
  expenseUsd,
  tokenBurn,
  syncSubs,
  syncApi,
  manualUsd,
  manifests,
  cicd,
  lastSyncAt,
  onSynced,
}: Props) {
  const { portfolio } = state
  const burn = expenseUsd + tokenBurn
  const budget = portfolio.monthlyBudgetUsd
  const burnPct = Math.min(100, Math.round((burn / budget) * 100))

  return (
    <>
      <ControlSurfaceBar
        controlSurface={state.controlSurface}
        skillGraph={state.skillGraph}
        ventures={state.ventures}
        lastSyncAt={lastSyncAt}
        onSynced={onSynced}
      />
      <FleetStrip ventures={state.ventures} manifests={manifests} cicd={cicd} />
      <WhatYouGet />
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
            <p className="muted tiny">
              {burnPct}% of ${budget} budget (expenses + token log)
            </p>

            <h3 className="subhead">Burn breakdown</h3>
            <ul className="focus-list burn-break">
              <li>
                Kill-list monthly est. <strong>${syncSubs.toFixed(0)}</strong>
              </li>
              <li>
                Synced venture APIs <strong>${syncApi.toFixed(2)}</strong>
              </li>
              <li>
                Manual USD expenses <strong>${manualUsd.toFixed(2)}</strong>
              </li>
              <li>
                Token log entries <strong>${tokenBurn.toFixed(2)}</strong>
              </li>
            </ul>
            <p className="muted tiny">
              Subs come from the audit kill list (est. monthly). Venture API rows
              sync from City/WhatsApp expense logs. Progress bars are not editable —
              run <code>npm run sync</code>.
            </p>

            <h3 className="subhead">Weekly focus</h3>
            <ul className="focus-list">
              {portfolio.weeklyFocus.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  )
}
