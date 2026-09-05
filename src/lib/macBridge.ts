/**
 * Where Throne talks for Start/Stop/Test/Sync.
 * - Local Vite: relative `/api` (middleware)
 * - Vercel: `VITE_KINGDOM_API_BASE` or localStorage `kingdom_api_base` → Mac bridge tunnel
 */

const LS_BASE = 'kingdom_api_base'
const LS_TOKEN = 'kingdom_control_token'

export function getStoredBridge(): { apiBase: string; token: string } {
  try {
    return {
      apiBase: (localStorage.getItem(LS_BASE) ?? '').replace(/\/$/, ''),
      token: localStorage.getItem(LS_TOKEN) ?? '',
    }
  } catch {
    return { apiBase: '', token: '' }
  }
}

export function setStoredBridge(apiBase: string, token: string) {
  localStorage.setItem(LS_BASE, apiBase.replace(/\/$/, ''))
  localStorage.setItem(LS_TOKEN, token)
}

export function clearStoredBridge() {
  localStorage.removeItem(LS_BASE)
  localStorage.removeItem(LS_TOKEN)
}

export function resolveApiBase(): string {
  const stored = getStoredBridge().apiBase
  if (stored) return stored
  const env = (import.meta.env.VITE_KINGDOM_API_BASE as string | undefined)?.replace(/\/$/, '')
  if (env) return env
  return ''
}

export function resolveControlToken(): string {
  const stored = getStoredBridge().token
  if (stored) return stored
  return (import.meta.env.VITE_KINGDOM_CONTROL_TOKEN as string | undefined) ?? ''
}

/** Absolute API prefix ending without trailing slash, or '' for same-origin `/api`. */
export function apiRoot(): string {
  const base = resolveApiBase()
  return base ? `${base}/api` : '/api'
}

export function authHeaders(extra?: HeadersInit): HeadersInit {
  const token = resolveControlToken()
  const headers: Record<string, string> = {
    ...(extra as Record<string, string> | undefined),
  }
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

export function isRemoteBridgeConfigured(): boolean {
  return Boolean(resolveApiBase())
}
