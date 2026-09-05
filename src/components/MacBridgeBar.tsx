import { useEffect, useState } from 'react'
import {
  clearStoredBridge,
  getStoredBridge,
  isRemoteBridgeConfigured,
  setStoredBridge,
} from '../lib/macBridge'
import { useServiceStatus } from '../hooks/useServiceStatus'

/**
 * Connect Vercel Throne → Mac orchestrator (when controls are offline).
 * Hidden while the API is reachable.
 */
export function MacBridgeBar() {
  const { apiOk, refresh } = useServiceStatus(8000)
  const [open, setOpen] = useState(false)
  const [apiBase, setApiBase] = useState('')
  const [token, setToken] = useState('')
  const [hint, setHint] = useState<string | null>(null)

  useEffect(() => {
    const s = getStoredBridge()
    setApiBase(s.apiBase || (import.meta.env.VITE_KINGDOM_API_BASE as string) || '')
    setToken(s.token || (import.meta.env.VITE_KINGDOM_CONTROL_TOKEN as string) || '')
  }, [])

  // Local Vite already has /api — no banner noise
  const onVercel =
    typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')
  const needBridge = onVercel || isRemoteBridgeConfigured()
  if (!needBridge && apiOk) return null
  if (apiOk && !open) return null

  function save() {
    setStoredBridge(apiBase.trim(), token.trim())
    setHint('Saved — probing Mac…')
    void refresh().then(() => setHint(null))
    setOpen(false)
  }

  function disconnect() {
    clearStoredBridge()
    setApiBase('')
    setToken('')
    setHint('Disconnected')
    void refresh()
  }

  return (
    <div className={`mac-bridge-bar ${apiOk ? 'ok' : 'warn'}`}>
      {apiOk ? (
        <p className="muted tiny">
          Mac bridge connected
          <button type="button" className="btn tiny-btn ghost" onClick={() => setOpen((v) => !v)}>
            Edit
          </button>
        </p>
      ) : (
        <p className="muted tiny">
          Mac bridge offline — run <code>npm run mac-bridge</code> on the Mac, then paste the URL +
          token.
          <button type="button" className="btn tiny-btn primary" onClick={() => setOpen(true)}>
            Connect Mac
          </button>
        </p>
      )}
      {open ? (
        <div className="mac-bridge-form">
          <label>
            API base (tunnel URL)
            <input
              value={apiBase}
              onChange={(e) => setApiBase(e.target.value)}
              placeholder="https://….trycloudflare.com"
              autoComplete="off"
            />
          </label>
          <label>
            Control token
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="KINGDOM_CONTROL_TOKEN"
              autoComplete="off"
              type="password"
            />
          </label>
          <div className="row-between">
            <button type="button" className="btn primary" onClick={save}>
              Save &amp; connect
            </button>
            <button type="button" className="btn ghost" onClick={disconnect}>
              Clear
            </button>
            <button type="button" className="btn" onClick={() => setOpen(false)}>
              Close
            </button>
          </div>
          {hint ? <p className="muted tiny">{hint}</p> : null}
        </div>
      ) : null}
    </div>
  )
}
