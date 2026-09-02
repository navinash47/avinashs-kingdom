import { useEffect, useState } from 'react'
import { useShareMode } from '../hooks/useShareMode'
import { bumpMirrorRefresh } from '../lib/mirrorRefresh'
import { triggerSync } from '../lib/orchestratorApi'

type ShareMeta = {
  url: string
  updated_at: string
  note?: string
}

type Props = {
  lastSyncAt?: string | null
  onRefreshMirror?: () => Promise<void>
}

function isGuestTunnelUrl(url: string | null | undefined) {
  if (!url) return false
  try {
    const u = new URL(url)
    return (
      u.protocol === 'https:' &&
      u.hostname.endsWith('.trycloudflare.com') &&
      u.hostname !== 'api.trycloudflare.com'
    )
  } catch {
    return false
  }
}

export function ShareBanner({ lastSyncAt, onRefreshMirror }: Props) {
  const shareMode = useShareMode()
  const [meta, setMeta] = useState<ShareMeta | null>(null)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [linkLive, setLinkLive] = useState<boolean | null>(null)

  useEffect(() => {
    if (shareMode) return
    let cancelled = false
    const load = () => {
      void fetch(`/data/share-url.json?_=${Date.now()}`, { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          if (cancelled) return
          if (j?.url && isGuestTunnelUrl(j.url)) setMeta(j as ShareMeta)
          else setMeta(null)
        })
        .catch(() => {})
    }
    load()
    const id = window.setInterval(load, 10_000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [shareMode])

  useEffect(() => {
    if (shareMode || !meta?.url) {
      setLinkLive(null)
      return
    }
    let cancelled = false
    const probe = () => {
      void fetch(meta.url, { method: 'HEAD', mode: 'no-cors', cache: 'no-store' })
        .then(() => {
          // no-cors opaque success ≠ healthy; also try a timed image/beacon via share-health proxy is better.
          // Fall back: GET share-url through kingdom only. Probe public link with short timeout via img trick is unreliable.
        })
        .catch(() => {})
      // Use orchestrator-side check when available; otherwise lightweight fetch to the guest origin root.
      void fetch(`${meta.url}/?_=${Date.now()}`, { mode: 'cors', cache: 'no-store' })
        .then((r) => {
          if (!cancelled) setLinkLive(r.ok)
        })
        .catch(() => {
          if (!cancelled) setLinkLive(false)
        })
    }
    probe()
    const id = window.setInterval(probe, 20_000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [shareMode, meta?.url])

  async function refreshMirror() {
    setBusy(true)
    setStatus(null)
    try {
      await onRefreshMirror?.()
      bumpMirrorRefresh()
      setStatus(`Synced ${new Date().toLocaleTimeString()}`)
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Refresh failed')
    } finally {
      setBusy(false)
    }
  }

  async function syncForFriends() {
    setBusy(true)
    setStatus(null)
    try {
      const r = await triggerSync()
      if (!r.ok) throw new Error(r.stderr || r.output || 'Sync failed')
      await onRefreshMirror?.()
      bumpMirrorRefresh()
      setStatus(
        `Data published ${new Date().toLocaleTimeString()} — if the link won’t open, run npm run share`,
      )
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Sync failed')
    } finally {
      setBusy(false)
    }
  }

  async function copyLink() {
    if (!meta?.url) return
    try {
      await navigator.clipboard.writeText(meta.url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  if (shareMode) {
    return (
      <div className="share-banner share-banner-guest" role="status">
        <div>
          <strong>Live guest view</strong>
          <span className="muted">
            Pull the latest Kingdom data from Avinash&apos;s Mac
            {lastSyncAt ? ` · host synced ${new Date(lastSyncAt).toLocaleString()}` : ''}
          </span>
          {status ? <span className="muted tiny share-status">{status}</span> : null}
        </div>
        <button
          type="button"
          className="btn primary tiny-btn"
          disabled={busy}
          onClick={() => void refreshMirror()}
        >
          {busy ? 'Refreshing…' : 'Refresh mirror'}
        </button>
      </div>
    )
  }

  if (!meta?.url) {
    return (
      <div className="share-banner share-banner-host share-banner-dead" role="status">
        <div>
          <strong>Share link offline</strong>
          <span className="muted tiny">
            No live Cloudflare tunnel. In a terminal run <code>npm run share</code> (~1–2 min), then
            copy the new link. <strong>Sync for friends</strong> only refreshes data — it does not
            create tunnels.
          </span>
          {status ? <span className="muted tiny share-status">{status}</span> : null}
        </div>
        <button
          type="button"
          className="btn tiny-btn"
          disabled={busy}
          onClick={() => void syncForFriends()}
        >
          {busy ? 'Syncing…' : 'Sync data only'}
        </button>
      </div>
    )
  }

  return (
    <div
      className={`share-banner share-banner-host${linkLive === false ? ' share-banner-dead' : ''}`}
      role="status"
    >
      <div>
        <strong>Share with friend</strong>
        <span className="muted tiny">
          {linkLive === false
            ? 'This Cloudflare link looks dead (loading forever). Run npm run share for a new URL.'
            : 'Sync for friends = publish data. Dead / spinning link = re-run npm run share.'}
        </span>
        <code className="share-url">{meta.url}</code>
        {status ? <span className="muted tiny share-status">{status}</span> : null}
      </div>
      <div className="share-banner-actions">
        <button
          type="button"
          className="btn primary tiny-btn"
          disabled={busy}
          onClick={() => void syncForFriends()}
        >
          {busy ? 'Syncing…' : 'Sync for friends'}
        </button>
        <button type="button" className="btn tiny-btn" onClick={() => void copyLink()}>
          {copied ? 'Copied' : 'Copy link'}
        </button>
      </div>
    </div>
  )
}
