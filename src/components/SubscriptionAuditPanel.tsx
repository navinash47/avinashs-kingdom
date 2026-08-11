import type { SubscriptionAudit } from '../types'

type Props = {
  data: SubscriptionAudit | null
}

export function SubscriptionAuditPanel({ data }: Props) {
  return (
    <section className="panel">
      <header className="panel-head">
        <h2>Subscription audit</h2>
        <p className="muted">
          Linked to ~/Projects/subscription-audit
          {data ? ` · ${data.annual_estimate}` : ' · no snapshot yet'}
        </p>
      </header>

      {!data ? (
        <div className="empty">
          <p>No kill-list snapshot loaded. Run the audit tool, then sync.</p>
        </div>
      ) : (
        <>
          <p className="mono tiny muted">{data.generated_from}</p>
          <ul className="kill-list">
            {data.items.map((item) => (
              <li key={item.name}>
                <div>
                  <strong>{item.name}</strong>
                  <span className="muted">
                    {item.cadence} · {item.annual}
                  </span>
                </div>
                {item.cancel_url ? (
                  <a href={item.cancel_url} target="_blank" rel="noreferrer">
                    Cancel path
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="cmd-box">
        <p className="subhead">Refresh</p>
        <pre>{`cd ~/Projects/subscription-audit
source .venv/bin/activate
subaudit ingest
subaudit serve
# then: npm run sync:audits  (from Kingdom)`}</pre>
      </div>
    </section>
  )
}
