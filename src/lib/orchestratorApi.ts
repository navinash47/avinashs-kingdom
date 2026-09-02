export type ServiceStatus = {
  name: string
  ventureId: string | null
  label: string
  port: number
  url: string
  embed: boolean
  status: 'up' | 'down'
  pid: number | null
  workdir: string
  workdirExists: boolean
  logTail: string | null
}

export type TestRunResult = {
  ok: boolean
  venture_id?: string
  ran_at?: string
  duration_ms?: number
  output?: string
  results?: {
    id: string
    label: string
    type: string
    ok: boolean
    duration_ms: number
    output?: string | null
    error?: string
  }[]
  error?: string
}

export type ServiceActionResult = {
  ok: boolean
  service: ServiceStatus
  output?: string
}

export type SyncResult = {
  ok: boolean
  synced_at: string
  stdout?: string
  stderr?: string
  output?: string
}

export type FinishResumeResult = {
  ok: boolean
  status?: number
  output?: string
  error?: string
  service?: ServiceStatus
}

export type ApproveLinkedInResult = {
  ok: boolean
  status?: number
  output?: string
  error?: string
  service?: ServiceStatus
  linkedin?: { status: string; approved_at: string }
}

const API = '/api'

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, init)
  const ct = res.headers.get('content-type') ?? ''
  // Vite/Vercel SPA fallbacks often return index.html with 200 for missing /api —
  // reject that so callers treat the orchestrator as offline instead of crashing.
  if (!ct.includes('application/json')) {
    throw new Error(res.ok ? 'API unavailable (non-JSON response)' : res.statusText)
  }
  const body = (await res.json().catch(() => ({ error: res.statusText }))) as {
    error?: string
    output?: string
  } & T
  if (!res.ok) {
    throw new Error(body.error ?? body.output ?? res.statusText)
  }
  return body
}

export async function fetchServices(): Promise<ServiceStatus[]> {
  const data = await apiFetch<{ services?: ServiceStatus[] }>('/services')
  return Array.isArray(data.services) ? data.services : []
}

export function serviceForVenture(
  services: ServiceStatus[] | null | undefined,
  ventureId: string,
): ServiceStatus | null {
  return (services ?? []).find((s) => s.ventureId === ventureId) ?? null
}

export async function fetchVentureService(ventureId: string): Promise<ServiceStatus | null> {
  try {
    return await apiFetch<ServiceStatus>(`/ventures/${ventureId}/service`)
  } catch {
    return null
  }
}

export async function fetchServiceLogs(name: string, lines = 80): Promise<string> {
  const data = await apiFetch<{ log: string }>(`/services/${name}/logs?lines=${lines}`)
  return data.log ?? ''
}

export async function startService(name: string): Promise<ServiceActionResult> {
  return apiFetch(`/services/${name}/start`, { method: 'POST' })
}

export async function stopService(name: string): Promise<ServiceActionResult> {
  return apiFetch(`/services/${name}/stop`, { method: 'POST' })
}

export async function restartService(name: string): Promise<ServiceActionResult> {
  return apiFetch(`/services/${name}/restart`, { method: 'POST' })
}

export async function startAllServices(): Promise<{ ok: boolean; output: string }> {
  return apiFetch('/services/start-all', { method: 'POST' })
}

export async function stopAllServices(): Promise<{ ok: boolean; output: string }> {
  return apiFetch('/services/stop-all', { method: 'POST' })
}

export async function runVentureTests(ventureId: string): Promise<TestRunResult> {
  return apiFetch(`/ventures/${ventureId}/test`, { method: 'POST' })
}

export async function runSingleTest(ventureId: string, testId: string): Promise<TestRunResult> {
  return apiFetch(`/ventures/${ventureId}/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ testId }),
  })
}

export async function runFinishResume(): Promise<FinishResumeResult> {
  const res = await fetch(`${API}/services/resume/finish-resume`, { method: 'POST' })
  const body = (await res.json().catch(() => ({ error: res.statusText }))) as FinishResumeResult
  if (!res.ok && !body.output) {
    throw new Error(body.error ?? res.statusText)
  }
  return body
}

export async function approveLinkedIn(): Promise<ApproveLinkedInResult> {
  const res = await fetch(`${API}/services/resume/approve-linkedin`, { method: 'POST' })
  const body = (await res.json().catch(() => ({ error: res.statusText }))) as ApproveLinkedInResult
  if (!res.ok && !body.output) {
    throw new Error(body.error ?? res.statusText)
  }
  return body
}

export async function triggerSync(): Promise<SyncResult> {
  const res = await fetch(`${API}/sync`, { method: 'POST' })
  const text = await res.text()
  if (!text.trim()) {
    throw new Error('Sync returned empty response — restart npm run dev and try again')
  }
  let body: SyncResult
  try {
    body = JSON.parse(text) as SyncResult
  } catch {
    throw new Error(`Sync returned invalid JSON: ${text.slice(0, 200)}`)
  }
  return body
}

export function formatTestOutput(result: TestRunResult): string {
  if (result.output) return result.output
  if (!result.results?.length) return result.error ?? ''
  return result.results
    .map((r) => {
      const head = `$ ${r.label} (${r.duration_ms}ms) — ${r.ok ? 'PASS' : 'FAIL'}`
      const body = r.output ?? r.error ?? ''
      return body ? `${head}\n${body}` : head
    })
    .join('\n\n')
}
