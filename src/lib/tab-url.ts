export const KINGDOM_TABS = [
  'throne',
  'analytics',
  'ventures',
  'research',
  'resume',
  'graph',
  'tokens',
  'expenses',
  'subs',
  'storage',
  'agents',
] as const

export type KingdomTab = (typeof KINGDOM_TABS)[number]

export function ventureIdFromFocus(focus?: string | null): string | null {
  if (!focus) return null
  const m = /^venture:(.+)$/.exec(focus)
  return m?.[1] ?? null
}

export function parseKingdomUrl(search: string): { tab: KingdomTab; focus: string | null } {
  const q = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  const rawTab = q.get('tab')
  const tab = KINGDOM_TABS.includes(rawTab as KingdomTab) ? (rawTab as KingdomTab) : 'throne'
  const focus = q.get('focus')
  return {
    tab,
    focus: focus && focus.startsWith('venture:') ? focus : null,
  }
}

export function kingdomSearch(tab: string, focus?: string | null): string {
  const q = new URLSearchParams()
  q.set('tab', tab)
  if ((tab === 'graph' || tab === 'ventures') && focus && focus.startsWith('venture:')) {
    q.set('focus', focus)
  }
  return `?${q.toString()}`
}
