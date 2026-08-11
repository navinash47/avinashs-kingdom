import type { MacAudit } from '../types'

function fmtBytes(n: number) {
  const gb = n / 1e9
  if (gb >= 1) return `${gb.toFixed(1)} GB`
  return `${(n / 1e6).toFixed(0)} MB`
}

type Props = {
  data: MacAudit | null
}

export function MacStorageAuditPanel({ data }: Props) {
  return (
    <section className="panel">
      <header className="panel-head">
        <h2>Mac storage audit</h2>
        <p className="muted">
          Linked to ~/Projects/mac-storage-audit
          {data?.disk?.note ? ` · ${data.disk.note}` : ' · no snapshot yet'}
        </p>
      </header>

      {!data ? (
        <div className="empty">
          <p>No storage summary loaded. Run a quick scan, then sync.</p>
        </div>
      ) : (
        <>
          <div className="disk-row">
            <div className="stat-block">
              <span className="stat-k">Used</span>
              <span className="stat-v">{data.disk.percent_used}%</span>
            </div>
            <div className="stat-block">
              <span className="stat-k">Free</span>
              <span className="stat-v">{fmtBytes(data.disk.free_bytes)}</span>
            </div>
            <div className="burn-meter">
              <div
                className="burn-fill"
                style={{ width: `${data.disk.percent_used}%` }}
              />
            </div>
          </div>

          <h3 className="subhead">Top reclaim moves</h3>
          <ul className="recs">
            {data.recommendations.map((r) => (
              <li key={r.title}>
                <div className="rec-top">
                  <strong>{r.title}</strong>
                  <span className={`risk risk-${r.risk}`}>{r.risk}</span>
                </div>
                <p className="muted tiny">
                  {fmtBytes(r.bytes)} · {r.rationale}
                </p>
                <code className="tiny">{r.action}</code>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="cmd-box">
        <p className="subhead">Refresh</p>
        <pre>{`cd ~/Projects/mac-storage-audit
python3 -m mac_storage_audit --quick --open
# then from Kingdom:
npm run sync:audits`}</pre>
      </div>
    </section>
  )
}
