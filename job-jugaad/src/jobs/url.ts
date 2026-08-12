/** Normalize ATS job URLs so the same posting maps to one DB row. */
export function normalizeJobUrl(raw: string): string {
  const trimmed = (raw || '').trim()
  if (!trimmed) return trimmed
  try {
    const u = new URL(trimmed)
    u.hash = ''
    // Drop tracking / referrer noise
    for (const key of [...u.searchParams.keys()]) {
      if (/^(utm_|ref$|source$|gh_src|lever-source|ashby_jid)/i.test(key)) {
        u.searchParams.delete(key)
      }
    }
    // Canonical Greenhouse board URLs
    const gh = u.hostname.match(/^(?:job-)?boards\.greenhouse\.io$/i)
    if (gh) {
      const m = u.pathname.match(/^\/([^/]+)\/jobs\/(\d+)/i)
      if (m) {
        return `https://boards.greenhouse.io/${m[1].toLowerCase()}/jobs/${m[2]}`
      }
    }
    // Ashby
    if (/ashbyhq\.com$/i.test(u.hostname)) {
      u.search = ''
      return u.toString().replace(/\/$/, '')
    }
    // Lever
    if (/lever\.co$/i.test(u.hostname)) {
      u.search = ''
      return u.toString().replace(/\/$/, '')
    }
    const q = u.searchParams.toString()
    return `${u.origin}${u.pathname.replace(/\/$/, '')}${q ? `?${q}` : ''}`
  } catch {
    return trimmed.split('#')[0].replace(/\/$/, '')
  }
}
