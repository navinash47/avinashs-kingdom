import { useEffect, useState } from 'react'
import { MIRROR_REFRESH_EVENT } from '../lib/mirrorRefresh'

export type ShareUrls = {
  url: string
  services: Record<string, string>
  by_name?: Record<string, string>
  updated_at?: string
}

export function useShareUrls() {
  const [share, setShare] = useState<ShareUrls | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = () => {
      void fetch(`/data/share-url.json?_=${Date.now()}`, { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          if (!cancelled && j?.url) setShare(j as ShareUrls)
        })
        .catch(() => {})
    }
    load()
    const id = window.setInterval(load, 15_000)
    const onRefresh = () => load()
    window.addEventListener(MIRROR_REFRESH_EVENT, onRefresh)
    return () => {
      cancelled = true
      window.clearInterval(id)
      window.removeEventListener(MIRROR_REFRESH_EVENT, onRefresh)
    }
  }, [])

  function publicDashboardUrl(port: number | null | undefined) {
    if (!port || !share?.services) return null
    return share.services[String(port)] ?? null
  }

  return { share, publicDashboardUrl }
}
