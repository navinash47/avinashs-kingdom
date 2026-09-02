import { useState } from 'react'
import type { SubscriptionAudit } from '../types'
import { startService, stopService } from '../lib/orchestratorApi'
import { useServiceStatus } from '../hooks/useServiceStatus'
import { operationLogKey, useOperationLog } from '../context/OperationLogContext'
import { useShareMode } from '../hooks/useShareMode'
import { useShareUrls } from '../hooks/useShareUrls'
import { subsDashboardSrc } from './DashboardEmbed'
import { OperationTerminal } from './OperationTerminal'

type Props = {
  data: SubscriptionAudit | null
}

export function SubscriptionAuditPanel({ data }: Props) {
  const { services, apiOk, refresh } = useServiceStatus()
  const subs = services.find((s) => s.name === 'subs')
  const shareMode = useShareMode()
  const { publicDashboardUrl } = useShareUrls()
  const subsSrc = subsDashboardSrc(shareMode, publicDashboardUrl(8741))
  const [busy, setBusy] = useState(false)
  const terminal = useOperationLog(operationLogKey('subs', 'dashboard'), 'Subs dashboard')

  async function toggle(action: 'start' | 'stop') {
    setBusy(true)
    terminal.setStatus('running')
    terminal.setOutput(`> ${action} subs dashboard…\n`)
    try {
      const out = action === 'start' ? await startService('subs') : await stopService('subs')
      terminal.appendOutput(out.output ?? '')
      terminal.setStatus(out.ok ? 'ok' : 'fail')
      await refresh()
    } catch (e) {
      terminal.appendOutput(`\n${e instanceof Error ? e.message : 'Failed'}`)
      terminal.setStatus('fail')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="panel">
      <header className="panel-head row-between">
        <div>
          <h2>Subscription audit</h2>
          <p className="muted">
            Dashboard :8741 · {subs?.status === 'up' ? 'UP' : 'DOWN'}
            {data ? ` · ${data.annual_estimate}` : ' · no snapshot yet'}
          </p>
        </div>
        <div className="fleet-actions">
          <button
            type="button"
            className="btn primary"
            disabled={!apiOk || busy || subs?.status === 'up'}
            onClick={() => void toggle('start')}
          >
            Start dashboard
          </button>
          {subs?.status === 'up' ? (
            <>
              <button type="button" className="btn" disabled={busy} onClick={() => void toggle('stop')}>
                Stop
              </button>
              <a className="btn" href="http://127.0.0.1:8741" target="_blank" rel="noreferrer">
                Open tab
              </a>
            </>
          ) : null}
        </div>
      </header>

      <OperationTerminal
        title={terminal.title}
        output={terminal.output}
        status={terminal.status}
        onClear={() => {
          terminal.clear()
          terminal.setStatus('idle')
        }}
      />

      {!data ? (
        <div className="empty">
          <p>No kill-list snapshot loaded. Start dashboard and run sync.</p>
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

      {subs?.status === 'up' ? (
        <div className="dashboard-embed" style={{ minHeight: 400 }}>
          <iframe title="Subs audit" src={subsSrc ?? undefined} className="dashboard-iframe" />
        </div>
      ) : null}
    </section>
  )
}
