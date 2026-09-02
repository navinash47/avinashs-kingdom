import type { WhatsAppPhases } from '../types'

type Props = {
  data: WhatsAppPhases | null
}

export function WhatsAppPhasesPanel({ data }: Props) {
  if (!data) {
    return (
      <section className="panel wa-phases">
        <header className="panel-head">
          <h2>Agent Cash · phases</h2>
          <p className="muted">No WhatsApp phase snapshot — run npm run sync</p>
        </header>
      </section>
    )
  }

  const spendPct = Math.min(
    100,
    Math.round((data.spend_usd / Math.max(1, data.ceiling_usd)) * 100),
  )
  const gate = data.last_evaluation?.result ?? '—'

  return (
    <section className="panel wa-phases">
      <header className="panel-head row-between">
        <div>
          <h2>Agent Cash · phases</h2>
          <p className="muted">
            {data.vertical} · {data.version} · {data.passed}/{data.total} pass
          </p>
        </div>
        <span className={`badge gate-${String(gate).toLowerCase()}`}>{gate}</span>
      </header>

      <div className="wa-stats">
        <div className="stat-block">
          <span className="stat-k">Current</span>
          <span className="stat-v tiny-stat">{data.next_milestone}</span>
        </div>
        <div className="stat-block">
          <span className="stat-k">Stage</span>
          <span className="stat-v">
            {data.stage} · {data.stage_name}
          </span>
        </div>
        <div className="stat-block">
          <span className="stat-k">API spend</span>
          <span className="stat-v">
            ${data.spend_usd.toFixed(2)} / ${data.ceiling_usd}
          </span>
        </div>
      </div>

      <div className="burn-meter">
        <div className="burn-fill" style={{ width: `${spendPct}%` }} />
      </div>
      <p className="muted tiny">{spendPct}% of WA $40 ceiling</p>

      <ul className="wa-phase-list">
        {data.phases.map((p) => (
          <li key={p.id} className={`wa-phase status-${p.status}`}>
            <span className="mono">P{p.id}</span>
            <span>{p.name}</span>
            <span className="badge ghost">{p.status}</span>
            {p.evaluation?.result ? (
              <span className="muted tiny">{p.evaluation.result}</span>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  )
}
