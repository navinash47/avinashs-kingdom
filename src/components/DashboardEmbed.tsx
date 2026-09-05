type Props = {
  port: number | null
  up: boolean
  embed: boolean
  label?: string
  /** Path on the dashboard host (e.g. /v2a for Comic). */
  path?: string
}

function localIframeSrc(port: number, path = '/'): string {
  const raw = path.startsWith('/') ? path : `/${path}`
  const hashIdx = raw.indexOf('#')
  const pathname = hashIdx >= 0 ? raw.slice(0, hashIdx) || '/' : raw
  const hash = hashIdx >= 0 ? raw.slice(hashIdx) : ''
  const origin = `http://127.0.0.1:${port}`
  const url = `${origin}${pathname === '/' ? '/' : pathname}`
  return `${url}${hash}`
}

export function DashboardEmbed({ port, up, embed, label, path = '/' }: Props) {
  if (!port) {
    return (
      <div className="dashboard-embed dashboard-embed-empty">
        <p className="muted">No local dashboard configured for this venture.</p>
        <p className="tiny muted">Use Run tests and Sync above, or add a dashboard in the registry.</p>
      </div>
    )
  }

  if (!embed) {
    return (
      <div className="dashboard-embed dashboard-embed-empty">
        <p className="strong">{label ?? 'Dashboard'}</p>
        <p className="muted">This venture is the orchestrator itself — no self-embed.</p>
        <p className="tiny muted">Use Sync and venture tabs below for ops.</p>
      </div>
    )
  }

  if (!up) {
    return (
      <div className="dashboard-embed dashboard-embed-empty">
        <p className="muted">Dashboard is stopped.</p>
        <p className="tiny muted">
          Click <strong>Start</strong> above to launch on port {port}, then <strong>Open</strong> (from
          this Mac).
        </p>
      </div>
    )
  }

  const iframeSrc = localIframeSrc(port, path)

  return (
    <div className="dashboard-embed">
      <p className="muted tiny embed-hint">Direct · :{port} — same UI as opening the project dashboard</p>
      <iframe
        title={label ?? `Dashboard :${port}`}
        src={iframeSrc}
        className="dashboard-iframe"
        allow="clipboard-read; clipboard-write"
      />
    </div>
  )
}

export function subsDashboardSrc() {
  return 'http://127.0.0.1:8741/'
}
