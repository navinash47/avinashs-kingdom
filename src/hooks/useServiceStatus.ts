import { useCallback, useEffect, useState } from 'react'
import { fetchServices, type ServiceStatus } from '../lib/orchestratorApi'

export function useServiceStatus(pollMs = 3000) {
  const [services, setServices] = useState<ServiceStatus[]>([])
  const [apiOk, setApiOk] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const list = await fetchServices()
      setServices(Array.isArray(list) ? list : [])
      setApiOk(true)
      setError(null)
    } catch (e) {
      setApiOk(false)
      setServices([])
      setError(e instanceof Error ? e.message : 'API unavailable')
    }
  }, [])

  useEffect(() => {
    void refresh()
    const t = window.setInterval(() => void refresh(), pollMs)
    return () => window.clearInterval(t)
  }, [refresh, pollMs])

  return { services, apiOk, error, refresh }
}
