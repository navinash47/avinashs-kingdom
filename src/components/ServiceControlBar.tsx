import type { ServiceStatus } from '../lib/orchestratorApi'
import { dashboardOpenUrl } from '../lib/shareMode'

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
        <p className="muted tiny bar-hint">Read-only guest view — controls run on Avinash&apos;s Mac</p>
      ) : !apiOk ? (
        <p className="muted tiny bar-hint">
          Control API runs inside Vite dev server — restart with <code>npm run dev</code> if buttons fail
        </p>
      ) : null}
      <div className="control-row">
        {service && !selfHosted && !readOnly ? (
          <>
            <button type="button" className="btn primary" disabled={busy || up} onClick={onStart}>
              Start
            </button>
            <button type="button" className="btn" disabled={busy || !up} onClick={onStop}>
              Stop
            </button>
            <button type="button" className="btn" disabled={busy} onClick={onRestart}>
              Restart
            </button>
            {service.port ? (
              <a
                className="btn ghost"
                href={dashboardOpenUrl(service.port)}
                target="_blank"
                rel="noreferrer"
              >
                Open demo
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
            <button type="button" className="btn" disabled={testRunning} onClick={onRunTests}>
              {testRunning ? 'Running tests…' : 'Run tests'}
            </button>
            <button type="button" className="btn" disabled={syncRunning} onClick={onSync}>
              {syncRunning ? 'Syncing…' : 'Sync Kingdom'}
            </button>
          </>
        ) : null}
      </div>
    </div>
  )
}
