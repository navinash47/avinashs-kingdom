import type { PhasesBoard } from '../types'
import { formatProgress } from '../lib/progress'

type Props = {
  data: PhasesBoard | null
}

export function PhasesBoardPanel({ data }: Props) {
  if (!data) {
    return (
      <section className="panel">
        <header className="panel-head">
          <h2>Phases board</h2>
          <p className="muted">No snapshot — run npm run sync</p>
        </header>
      </section>
    )
  }

  return (
    <section className="panel phases-board">
      <header className="panel-head">
        <h2>Phases · versions · progress</h2>
        <p className="muted">
          All provinces · synced {new Date(data.synced_at).toLocaleString()}
        </p>
      </header>

      <div className="phases-table-wrap">
        <table className="phases-table">
          <thead>
            <tr>
              <th>Venture</th>
              <th>Version</th>
              <th>Progress</th>
              <th>Phases</th>
              <th>Priority</th>
              <th>Next</th>
            </tr>
          </thead>
          <tbody>
            {data.ventures.map((v) => (
              <tr key={v.id} className={v.status === 'parked' ? 'row-parked' : ''}>
                <td>{v.name}</td>
                <td className="mono">{v.version}</td>
                <td>
                  <strong>{formatProgress(v.progress)}</strong>
                  {v.progressSource ? (
                    <div className="muted tiny">{v.progressSource}</div>
                  ) : null}
                </td>
                <td className="mono">
                  {v.phasesPassed != null && v.phasesTotal != null
                    ? `${v.phasesPassed}/${v.phasesTotal}`
                    : '—'}
                </td>
                <td>
                  {v.priority} · {v.status}
                </td>
                <td>{v.nextMilestone}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <details className="rules-fold">
        <summary>How progress &amp; burn are calculated</summary>
        <ul className="focus-list">
          {Object.entries(data.progress_rules).map(([id, rule]) => (
            <li key={id}>
              <code>{id}</code> — {rule}
            </li>
          ))}
        </ul>
        <p className="muted tiny">
          Budget: {data.burn_rules.monthly_budget_usd}. Burn:{' '}
          {data.burn_rules.tracked_burn}. {data.burn_rules.not_included}.
        </p>
      </details>
    </section>
  )
}
