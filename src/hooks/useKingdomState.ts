import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  Agent,
  Expense,
  KingdomState,
  MacAudit,
  Portfolio,
  SubscriptionAudit,
  TokensState,
  Venture,
} from '../types'

const STORAGE_KEY = 'avinash-kingdom-v1'

async function loadJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}

function isSyncedExpense(e: Expense) {
  return String(e.id).startsWith('sync-')
}

/** Seed venture fields win for synced repos; keep local edits for weight/agent/repo. */
function mergeVentures(local: Venture[], seed: Venture[]): Venture[] {
  const seedMap = new Map(seed.map((v) => [v.id, v]))
  return local.map((v) => {
    const s = seedMap.get(v.id)
    if (!s) return v
    return {
      ...v,
      version: s.version,
      progress: s.progress,
      priority: s.priority,
      status: s.status,
      nextMilestone: s.nextMilestone,
      notes: s.notes,
      weight: s.weight,
      repoPath: s.repoPath ?? v.repoPath,
      agentId: s.agentId ?? v.agentId,
    }
  })
}

/** Synced expenses replace previous sync-* rows; manual / local rows stay. */
function mergeExpenses(local: Expense[], seed: Expense[]): Expense[] {
  const synced = seed.filter(isSyncedExpense)
  const manual = local.filter((e) => !isSyncedExpense(e))
  const manualIds = new Set(manual.map((e) => e.id))
  const seedManual = seed.filter((e) => !isSyncedExpense(e) && !manualIds.has(e.id))
  return [...synced, ...manual, ...seedManual]
}

export function useKingdomState() {
  const [state, setState] = useState<KingdomState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [subscription, mac, seedVentures, seedExpenses, syncMeta] =
          await Promise.all([
            loadJson<SubscriptionAudit>('/data/audits/subscription-kill-list.json'),
            loadJson<MacAudit>('/data/audits/mac-storage-summary.json'),
            loadJson<Venture[]>('/data/ventures.json'),
            loadJson<Expense[]>('/data/expenses.json'),
            loadJson<{ synced_at?: string }>('/data/audits/ventures-sync.json'),
          ])

        const cached = localStorage.getItem(STORAGE_KEY)
        if (cached) {
          const parsed = JSON.parse(cached) as KingdomState
          const next: KingdomState = {
            ...parsed,
            subscription,
            mac,
            ventures: seedVentures
              ? mergeVentures(parsed.ventures, seedVentures)
              : parsed.ventures,
            expenses: seedExpenses
              ? mergeExpenses(parsed.expenses, seedExpenses)
              : parsed.expenses,
          }
          if (!cancelled) {
            setState(next)
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
            setLastSyncAt(syncMeta?.synced_at ?? null)
            setReady(true)
          }
          return
        }

        const [portfolio, ventures, agents, expenses, tokens] = await Promise.all([
          loadJson<Portfolio>('/data/portfolio.json'),
          loadJson<Venture[]>('/data/ventures.json'),
          loadJson<Agent[]>('/data/agents.json'),
          loadJson<Expense[]>('/data/expenses.json'),
          loadJson<TokensState>('/data/tokens.json'),
        ])

        if (!portfolio || !ventures || !agents || !expenses || !tokens) {
          throw new Error('Missing core Kingdom data files')
        }

        const next: KingdomState = {
          portfolio,
          ventures,
          agents,
          expenses,
          tokens,
          subscription,
          mac,
        }
        if (!cancelled) {
          setState(next)
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
          setLastSyncAt(syncMeta?.synced_at ?? null)
          setReady(true)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load Kingdom')
          setReady(true)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const persist = useCallback((next: KingdomState) => {
    setState(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }, [])

  const updateVenture = useCallback(
    (id: string, patch: Partial<Venture>) => {
      if (!state) return
      persist({
        ...state,
        ventures: state.ventures.map((v) => (v.id === id ? { ...v, ...patch } : v)),
      })
    },
    [persist, state],
  )

  const updateAgentBudget = useCallback(
    (id: string, tokenBudgetUsd: number) => {
      if (!state) return
      persist({
        ...state,
        agents: state.agents.map((a) =>
          a.id === id ? { ...a, tokenBudgetUsd } : a,
        ),
      })
    },
    [persist, state],
  )

  const addExpense = useCallback(
    (expense: Omit<Expense, 'id'>) => {
      if (!state) return
      persist({
        ...state,
        expenses: [{ ...expense, id: uid('exp') }, ...state.expenses],
      })
    },
    [persist, state],
  )

  const removeExpense = useCallback(
    (id: string) => {
      if (!state) return
      persist({
        ...state,
        expenses: state.expenses.filter((e) => e.id !== id),
      })
    },
    [persist, state],
  )

  const addTokenEntry = useCallback(
    (entry: Omit<import('../types').TokenEntry, 'id'>) => {
      if (!state) return
      persist({
        ...state,
        tokens: {
          ...state.tokens,
          entries: [{ ...entry, id: uid('tok') }, ...state.tokens.entries],
        },
      })
    },
    [persist, state],
  )

  const exportState = useCallback(() => {
    if (!state) return
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kingdom-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [state])

  const importState = useCallback(
    async (file: File) => {
      const text = await file.text()
      const parsed = JSON.parse(text) as KingdomState
      persist(parsed)
    },
    [persist],
  )

  const resetToSeed = useCallback(async () => {
    localStorage.removeItem(STORAGE_KEY)
    window.location.reload()
  }, [])

  const totals = useMemo(() => {
    if (!state) return null
    const expenseUsd = state.expenses
      .filter((e) => e.currency === 'USD')
      .reduce((s, e) => s + e.amount, 0)
    const expenseInr = state.expenses
      .filter((e) => e.currency === 'INR')
      .reduce((s, e) => s + e.amount, 0)
    const tokenBurn = state.tokens.entries.reduce((s, e) => s + e.usd, 0)
    const agentBurn = state.agents.reduce((s, a) => s + a.tokenUsedUsd, 0)
    return { expenseUsd, expenseInr, tokenBurn, agentBurn }
  }, [state])

  return {
    state,
    ready,
    error,
    totals,
    lastSyncAt,
    updateVenture,
    updateAgentBudget,
    addExpense,
    removeExpense,
    addTokenEntry,
    exportState,
    importState,
    resetToSeed,
  }
}
