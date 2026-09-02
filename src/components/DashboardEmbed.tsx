import { useEffect, useState } from 'react'
import { useShareMode } from '../hooks/useShareMode'
import { useShareUrls } from '../hooks/useShareUrls'
import { MIRROR_REFRESH_EVENT } from '../lib/mirrorRefresh'

type Props = {
  port: number | null
  up: boolean
  embed: boolean
  label?: string
  /** Path on the dashboard host (e.g. /v2a for Comic). */
  path?: string
}

/** Direct dashboard URL — never /embed/ (breaks fetch('/api/…') inside dashboard JS). */
function dashboardIframeSrc(
  port: number,
  shareMode: boolean,
  publicUrl: string | null,
  path = '/',
  bust = 0,
): string | null {
  const raw = path.startsWith('/') ? path : `/${path}`
  const hashIdx = raw.indexOf('#')
  const pathname = hashIdx >= 0 ? raw.slice(0, hashIdx) || '/' : raw
  const hash = hashIdx >= 0 ? raw.slice(hashIdx) : ''
  let origin: string | null = null
  if (shareMode) {
    if (!publicUrl) return null
    origin = publicUrl.replace(/\/$/, '')
  } else {
    origin = `http://127.0.0.1:${port}`
  }
  let url = `${origin}${pathname === '/' ? '/' : pathname}`
  if (bust) {
    const join = url.includes('?') ? '&' : '?'
    url = `${url}${join}_mirror=${bust}`
  }
  return `${url}${hash}`
}

export function DashboardEmbed({ port, up, embed, label, path = '/' }: Props) {
  const shareMode = useShareMode()
  const { publicDashboardUrl } = useShareUrls()
  const publicUrl = publicDashboardUrl(port)
  const [bust, setBust] = useState(0)

  useEffect(() => {
    const onRefresh = (e: Event) => {
      const at = (e as CustomEvent<{ at?: number }>).detail?.at ?? Date.now()
      setBust(at)
    }
    window.addEventListener(MIRROR_REFRESH_EVENT, onRefresh)
    return () => window.removeEventListener(MIRROR_REFRESH_EVENT, onRefresh)
  }, [])

  const iframeSrc = port ? dashboardIframeSrc(port, shareMode, publicUrl, path, bust) : null

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
        <p className="tiny muted">Use Sync Kingdom and venture tabs below for ops.</p>
      </div>
    )
  }

  if (!up) {
    return (
      <div className="dashboard-embed dashboard-embed-empty">
        <p className="muted">Dashboard is stopped.</p>
        <p className="tiny muted">
          Click <strong>Start</strong> above to launch on port {port}.
        </p>
      </div>
    )
  }

  if (shareMode && !iframeSrc) {
    return (
      <div className="dashboard-embed dashboard-embed-empty">
        <p className="muted">Demo tunnel missing for :{port}</p>
        <p className="tiny muted">
          On your Mac run <code>npm run share</code> to refresh public demo links.
        </p>
      </div>
    )
  }

  return (
    <div className="dashboard-embed">
      <p className="muted tiny embed-hint">
        {shareMode ? 'Live dashboard mirror' : `Direct · :${port}`} — same UI as opening the project
        dashboard
      </p>
      <iframe
        key={bust || 'live'}
        title={label ?? `Dashboard :${port}`}
        src={iframeSrc!}
        className="dashboard-iframe"
        allow="clipboard-read; clipboard-write"
      />
    </div>
  )
}

export function subsDashboardSrc(shareMode: boolean, publicUrl: string | null) {
  if (shareMode) return publicUrl
  return 'http://127.0.0.1:8741/'
}
