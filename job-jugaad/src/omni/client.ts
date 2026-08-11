const OMNI_BASE = process.env.OMNIROUTE_BASE || 'http://localhost:20128'

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

export async function omniChat(
  messages: ChatMessage[],
  opts: { model?: string; temperature?: number } = {},
): Promise<string> {
  const res = await fetch(`${OMNI_BASE}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: opts.model || 'auto',
      temperature: opts.temperature ?? 0.2,
      messages,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`OmniRoute chat failed ${res.status}: ${text.slice(0, 400)}`)
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  return data.choices?.[0]?.message?.content?.trim() || ''
}

export async function omniWebFetch(
  url: string,
  opts: { provider?: string } = {},
): Promise<string> {
  const res = await fetch(`${OMNI_BASE}/v1/web/fetch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,
      provider: opts.provider || 'firecrawl',
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`OmniRoute web fetch failed ${res.status}: ${text.slice(0, 400)}`)
  }
  const data = (await res.json()) as {
    content?: string
    markdown?: string
    text?: string
    data?: { markdown?: string; content?: string }
  }
  return (
    data.markdown ||
    data.content ||
    data.text ||
    data.data?.markdown ||
    data.data?.content ||
    JSON.stringify(data).slice(0, 8000)
  )
}

export function isOmniReachable(): Promise<boolean> {
  return fetch(`${OMNI_BASE}/`, { method: 'GET' })
    .then((r) => r.ok || r.status < 500)
    .catch(() => false)
}
