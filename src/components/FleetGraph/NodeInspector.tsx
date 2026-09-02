import type { FleetNodeData } from '../../lib/fleetGraph'
import type { ServiceStatus } from '../../lib/orchestratorApi'

type Props = {
  data: FleetNodeData | null
  service: ServiceStatus | null
  readOnly: boolean
  busy: boolean
  onClose: () => void
  onOpenVenture: (tab: 'run' | 'overview' | 'architecture') => void
  onStart?: () => void
  onStop?: () => void
  onCopyUrl?: () => void
}

export function NodeInspector({
  data,
  service,
  readOnly,
  busy,
  onClose,
  onOpenVenture,
  onStart,
  onStop,
  onCopyUrl,
}: Props) {
  if (!data) return null

  const canOpenVenture = Boolean(data.ventureId)
  const canControl =
    !readOnly && data.kind === 'service' && Boolean(data.serviceName || service?.name)

  return (
    <aside className="fleet-inspector" aria-label="Node details">
      <header className="fleet-inspector-head">
        <div>
          <p className="eyebrow">{data.kind}</p>
          <h2>{data.label}</h2>
          {data.subtitle ? <p className="muted tiny">{data.subtitle}</p> : null}
        </div>
        <button type="button" className="btn ghost tiny-btn" onClick={onClose}>
          Close
        </button>
      </header>

      <div className="fleet-inspector-meta">
        {data.status ? (
          <span className="badge">{data.status}</span>
        ) : null}
        {data.priority ? <span className="badge ghost">{data.priority}</span> : null}
        {data.port != null ? <span className="badge ghost">:{data.port}</span> : null}
        {data.progress != null ? (
          <span className="badge ghost">{data.progress}%</span>
        ) : null}
      </div>

      <p className="fleet-inspector-blurb">{data.blurb}</p>

      {data.nextMilestone ? (
        <div className="fleet-inspector-block">
          <h4>Next</h4>
          <p className="muted tiny">{data.nextMilestone}</p>
        </div>
      ) : null}

      {data.github ? (
        <div className="fleet-inspector-block">
          <h4>GitHub</h4>
          <a
            href={`https://github.com/${data.github}`}
            target="_blank"
            rel="noreferrer"
          >
            {data.github}
          </a>
        </div>
      ) : null}

      {service ? (
        <div className="fleet-inspector-block">
          <h4>Service</h4>
          <p className="muted tiny">
            {service.label} · {service.status.toUpperCase()}
            {service.pid ? ` · pid ${service.pid}` : ''}
          </p>
        </div>
      ) : null}

      <div className="fleet-inspector-actions">
        {canOpenVenture ? (
          <>
            <button
              type="button"
              className="btn primary tiny-btn"
              onClick={() => onOpenVenture('run')}
            >
              Open Run
            </button>
            <button
              type="button"
              className="btn tiny-btn"
              onClick={() => onOpenVenture('overview')}
            >
              Overview
            </button>
            <button
              type="button"
              className="btn tiny-btn"
              onClick={() => onOpenVenture('architecture')}
            >
              Architecture
            </button>
          </>
        ) : null}
        {data.port != null && onCopyUrl ? (
          <button type="button" className="btn tiny-btn" onClick={onCopyUrl}>
            Copy local URL
          </button>
        ) : null}
        {canControl && service?.status === 'down' && onStart ? (
          <button
            type="button"
            className="btn tiny-btn"
            disabled={busy}
            onClick={onStart}
          >
            Start
          </button>
        ) : null}
        {canControl && service?.status === 'up' && onStop ? (
          <button
            type="button"
            className="btn tiny-btn"
            disabled={busy}
            onClick={onStop}
          >
            Stop
          </button>
        ) : null}
      </div>
    </aside>
  )
}
