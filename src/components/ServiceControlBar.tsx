import type { ServiceStatus } from '../lib/orchestratorApi'
import { dashboardOpenUrl } from '../lib/orchestratorApi'

type Props = {
  service: ServiceStatus | null
  busy: boolean
  onStart: () => void
  onStop: () => void
  onRestart: () => void
  onRunTests: () => void
  onSync: () => void
  testRunning?: boolean
  syncRunning?: boolean
  apiOk: boolean
  selfHosted?: boolean
  readOnly?: boolean
}

export function ServiceControlBar({
  service,
  busy,
  onStart,
  onStop,
  onRestart,
  onRunTests,
  onSync,
  testRunning,
  syncRunning,
  apiOk,
  selfHosted,
  readOnly,
}: Props) {
  const up = service?.status === 'up'

  return (
    <div className="service-control-bar">
      {readOnly ? (
        <p className="muted tiny bar-hint">Read-only</p>
      ) : !apiOk ? (
        <p className="muted tiny bar-hint">
          Mac bridge offline — run <code>npm run mac-bridge</code> (or local <code>npm run dev</code>)
          and Connect Mac
        </p>
      ) : null}
      <div className="control-row">
        {service && !selfHosted && !readOnly ? (
          <>
            <button type="button" className="btn primary" disabled={busy || !apiOk || up} onClick={onStart}>
              Start
            </button>
            <button type="button" className="btn" disabled={busy || !apiOk || !up} onClick={onStop}>
              Stop
            </button>
            <button type="button" className="btn" disabled={busy || !apiOk} onClick={onRestart}>
              Restart
            </button>
            {service.port ? (
              <a
                className="btn ghost"
                href={dashboardOpenUrl(service.port)}
                target="_blank"
                rel="noreferrer"
                title="Opens on this Mac at 127.0.0.1 — browse Vercel from the Mac for Open to work"
              >
                Open
              </a>
            ) : null}
            <span className={`badge ${up ? 'ok' : 'warn'}`}>
              {up ? 'UP' : 'DOWN'} :{service.port}
            </span>
          </>
        ) : service && !selfHosted && readOnly ? (
          <span className={`badge ${up ? 'ok' : 'warn'}`}>
            {up ? 'LIVE' : 'OFFLINE'} :{service.port}
          </span>
        ) : selfHosted ? (
          <span className="badge ok">Venture Fleet Control Plane — this page</span>
        ) : (
          <span className="muted tiny">No dashboard service for this venture</span>
        )}
        <span className="control-spacer" />
        {!readOnly ? (
          <>
            <button
              type="button"
              className="btn"
              disabled={testRunning || !apiOk}
              onClick={onRunTests}
            >
              {testRunning ? 'Running tests…' : 'Run tests'}
            </button>
            <button type="button" className="btn" disabled={syncRunning || !apiOk} onClick={onSync}>
              {syncRunning ? 'Syncing…' : 'Sync'}
            </button>
          </>
        ) : null}
      </div>
    </div>
  )
}
