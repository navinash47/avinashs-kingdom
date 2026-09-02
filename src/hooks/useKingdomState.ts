import { useCallback, useEffect, useMemo, useState } from 'react'
import { isShareHost } from '../lib/shareMode'
import type {
  Agent,
  ArchitectureBundle,
  CicdSnapshot,
  ExperimentsBundle,
  Expense,
  KingdomState,
  MacAudit,
  PhasesBoard,
  Portfolio,
  PortfolioRepo,
  SkillGraph,
  ResumeKnowledge,
  SubscriptionAudit,
  TokensState,
  Venture,
  VentureManifest,
  VentureRegistry,
  WhatsAppPhases,
} from '../types'

/** Bump when seed merge rules change so parked/local progress ghosts clear. */
const STORAGE_KEY = 'avinash-kingdom-v4'

async function loadJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(`${url}${url.includes('?') ? '&' : '?'}_=${Date.now()}`, {
      cache: 'no-store',
    })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

async function loadOrchestratorBundles(registry: VentureRegistry | null) {
  const manifests: Record<string, VentureManifest> = {}
  const architecture: Record<string, ArchitectureBundle> = {}
  const experiments: Record<string, ExperimentsBundle> = {}
  const cicd: Record<string, CicdSnapshot> = {}
  let globalSuggestions: string[] = []
  let skillGraph: SkillGraph | null = null

  const index = await loadJson<{ global_suggestions?: string[] }>(
    '/data/manifests-index.json',
  )
  globalSuggestions = index?.global_suggestions ?? []
  skillGraph = await loadJson<SkillGraph>('/data/skill-graph.json')

  const ids = registry?.ventures?.map((v) => v.id) ?? []
  await Promise.all(
    ids.map(async (id) => {
      const [m, a, e, c] = await Promise.all([
        loadJson<VentureManifest>(`/data/manifests/${id}.json`),
        loadJson<ArchitectureBundle>(`/data/architecture/${id}.json`),
        loadJson<ExperimentsBundle>(`/data/experiments/${id}.json`),
        loadJson<CicdSnapshot>(`/data/cicd/${id}.json`),
      ])
      if (m) manifests[id] = m
      if (a) architecture[id] = a
      if (e) experiments[id] = e
      if (c) cicd[id] = c
    }),
  )

  return { manifests, architecture, experiments, cicd, globalSuggestions, skillGraph }
}

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}

function isSyncedExpense(e: Expense) {
  return String(e.id).startsWith('sync-')
}

/** Seed venture fields always win for progress/version/priority — UI cannot park forever. */
function mergeVentures(local: Venture[], seed: Venture[]): Venture[] {
  const seedMap = new Map(seed.map((v) => [v.id, v]))
  const ids = new Set([...local.map((v) => v.id), ...seed.map((v) => v.id)])
  return [...ids].map((id) => {
    const s = seedMap.get(id)
    const v = local.find((x) => x.id === id)
    if (s && v) {
      return {
        ...v,
        ...s,
        weight: s.weight,
        repoPath: s.repoPath ?? v.repoPath,
        agentId: s.agentId ?? v.agentId,
      }
    }
    return (s ?? v)!
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
  const [globalSuggestions, setGlobalSuggestions] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [
          subscription,
          mac,
          whatsapp,
          phasesBoard,
          resumeKnowledge,
          portfolioRepo,
          seedVentures,
          seedExpenses,
          syncMeta,
          registry,
        ] = await Promise.all([
          loadJson<SubscriptionAudit>('/data/audits/subscription-kill-list.json'),
          loadJson<MacAudit>('/data/audits/mac-storage-summary.json'),
          loadJson<WhatsAppPhases>('/data/audits/whatsapp-phases.json'),
          loadJson<PhasesBoard>('/data/audits/phases-board.json'),
          loadJson<ResumeKnowledge>('/data/resume-knowledge.json'),
          loadJson<PortfolioRepo>('/data/portfolio-repo.json'),
          loadJson<Venture[]>('/data/ventures.json'),
          loadJson<Expense[]>('/data/expenses.json'),
          loadJson<{ synced_at?: string }>('/data/audits/ventures-sync.json'),
          loadJson<VentureRegistry>('/data/venture-registry.json'),
        ])

        const bundles = await loadOrchestratorBundles(registry)

        const cached = isShareHost() ? null : localStorage.getItem(STORAGE_KEY)
        if (cached) {
          const parsed = JSON.parse(cached) as KingdomState
          const seedPortfolio = await loadJson<Portfolio>('/data/portfolio.json')
          const seedAgents = await loadJson<Agent[]>('/data/agents.json')
          const next: KingdomState = {
            ...parsed,
            portfolio: seedPortfolio ?? parsed.portfolio,
            agents: seedAgents ?? parsed.agents,
            subscription,
            mac,
            whatsapp,
            phasesBoard,
            resumeKnowledge,
            portfolioRepo,
            registry,
            ...bundles,
            skillGraph: bundles.skillGraph,
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
            setGlobalSuggestions(bundles.globalSuggestions)
            setLastSyncAt(
              phasesBoard?.synced_at ?? syncMeta?.synced_at ?? null,
            )
            setReady(true)
          }
          return
        }

        const [portfolio, ventures, agents, expenses, tokens] =
          await Promise.all([
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
          whatsapp,
          phasesBoard,
          resumeKnowledge,
          portfolioRepo,
          registry,
          ...bundles,
          skillGraph: bundles.skillGraph,
        }
        if (!cancelled) {
          setState(next)
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
          setGlobalSuggestions(bundles.globalSuggestions)
          setLastSyncAt(
            phasesBoard?.synced_at ?? syncMeta?.synced_at ?? null,
          )
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

  // Keep UI aligned with latest sync-kingdom output (host + guest)
  useEffect(() => {
    if (!ready) return
    let cancelled = false
    const tick = async () => {
      try {
        const [
          subscription,
          mac,
          whatsapp,
          phasesBoard,
          resumeKnowledge,
          portfolioRepo,
          seedVentures,
          syncMeta,
          registry,
        ] = await Promise.all([
          loadJson<SubscriptionAudit>('/data/audits/subscription-kill-list.json'),
          loadJson<MacAudit>('/data/audits/mac-storage-summary.json'),
          loadJson<WhatsAppPhases>('/data/audits/whatsapp-phases.json'),
          loadJson<PhasesBoard>('/data/audits/phases-board.json'),
          loadJson<ResumeKnowledge>('/data/resume-knowledge.json'),
          loadJson<PortfolioRepo>('/data/portfolio-repo.json'),
          loadJson<Venture[]>('/data/ventures.json'),
          loadJson<{ synced_at?: string }>('/data/audits/ventures-sync.json'),
          loadJson<VentureRegistry>('/data/venture-registry.json'),
        ])
        if (cancelled || !seedVentures) return
        const bundles = await loadOrchestratorBundles(registry)
        setState((prev) => {
          if (!prev) return prev
          if (isShareHost()) {
            return {
              ...prev,
              subscription,
              mac,
              whatsapp,
              phasesBoard,
              resumeKnowledge,
              portfolioRepo,
              registry,
              ventures: seedVentures,
              ...bundles,
              skillGraph: bundles.skillGraph,
            }
          }
          return {
            ...prev,
            subscription,
            mac,
            whatsapp,
            phasesBoard,
            resumeKnowledge,
            portfolioRepo,
            registry,
            ventures: mergeVentures(prev.ventures, seedVentures),
            ...bundles,
            skillGraph: bundles.skillGraph,
          }
        })
        setGlobalSuggestions(bundles.globalSuggestions)
        setLastSyncAt(phasesBoard?.synced_at ?? syncMeta?.synced_at ?? null)
      } catch {
        /* ignore */
      }
    }
    void tick()
    const id = window.setInterval(() => void tick(), isShareHost() ? 10_000 : 20_000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [ready])

  const persist = useCallback((next: KingdomState) => {
    setState(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }, [])

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

  const updateVenture = useCallback(
    (id: string, patch: Partial<Venture>) => {
      if (!state) return
      persist({
        ...state,
        ventures: state.ventures.map((v) =>
          v.id === id ? { ...v, ...patch } : v,
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
    // Also clear older keys that held parked ghosts
    localStorage.removeItem('avinash-kingdom-v2')
    localStorage.removeItem('avinash-kingdom-v1')
    window.location.reload()
  }, [])

  /** Reload all /data/* seed JSON (what Cloudflare guests see). */
  const refreshFromHost = useCallback(async () => {
    const [
      subscription,
      mac,
      whatsapp,
      phasesBoard,
      resumeKnowledge,
      portfolioRepo,
      seedVentures,
      seedExpenses,
      syncMeta,
      registry,
      portfolio,
      agents,
      tokens,
    ] = await Promise.all([
      loadJson<SubscriptionAudit>('/data/audits/subscription-kill-list.json'),
      loadJson<MacAudit>('/data/audits/mac-storage-summary.json'),
      loadJson<WhatsAppPhases>('/data/audits/whatsapp-phases.json'),
      loadJson<PhasesBoard>('/data/audits/phases-board.json'),
      loadJson<ResumeKnowledge>('/data/resume-knowledge.json'),
      loadJson<PortfolioRepo>('/data/portfolio-repo.json'),
      loadJson<Venture[]>('/data/ventures.json'),
      loadJson<Expense[]>('/data/expenses.json'),
      loadJson<{ synced_at?: string }>('/data/audits/ventures-sync.json'),
      loadJson<VentureRegistry>('/data/venture-registry.json'),
      loadJson<Portfolio>('/data/portfolio.json'),
      loadJson<Agent[]>('/data/agents.json'),
      loadJson<TokensState>('/data/tokens.json'),
    ])
    if (!seedVentures) throw new Error('Could not load ventures.json from host')
    const bundles = await loadOrchestratorBundles(registry)
    setState((prev) => {
      let next: KingdomState | null = null
      if (!prev) {
        if (!portfolio || !agents || !seedExpenses || !tokens) return prev
        next = {
          portfolio,
          ventures: seedVentures,
          agents,
          expenses: seedExpenses,
          tokens,
          subscription,
          mac,
          whatsapp,
          phasesBoard,
          resumeKnowledge,
          portfolioRepo,
          registry,
          ...bundles,
          skillGraph: bundles.skillGraph,
        }
      } else {
        next = {
          ...prev,
          portfolio: portfolio ?? prev.portfolio,
          agents: agents ?? prev.agents,
          tokens: tokens ?? prev.tokens,
          subscription,
          mac,
          whatsapp,
          phasesBoard,
          resumeKnowledge,
          portfolioRepo,
          registry,
          ventures: isShareHost() ? seedVentures : mergeVentures(prev.ventures, seedVentures),
          expenses: seedExpenses
            ? isShareHost()
              ? seedExpenses
              : mergeExpenses(prev.expenses, seedExpenses)
            : prev.expenses,
          ...bundles,
          skillGraph: bundles.skillGraph,
        }
      }
      if (next && !isShareHost()) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      }
      return next
    })
    setGlobalSuggestions(bundles.globalSuggestions)
    setLastSyncAt(phasesBoard?.synced_at ?? syncMeta?.synced_at ?? new Date().toISOString())
  }, [])

  const totals = useMemo(() => {
    if (!state) return null
    const syncExpenses = state.expenses.filter(
      (e) => e.currency === 'USD' && isSyncedExpense(e),
    )
    const manualUsd = state.expenses
      .filter((e) => e.currency === 'USD' && !isSyncedExpense(e))
      .reduce((s, e) => s + e.amount, 0)
    const syncSubs = syncExpenses
      .filter((e) => String(e.id).startsWith('sync-sub-'))
      .reduce((s, e) => s + e.amount, 0)
    const syncApi = syncExpenses
      .filter((e) => !String(e.id).startsWith('sync-sub-'))
      .reduce((s, e) => s + e.amount, 0)
    const expenseUsd = state.expenses
      .filter((e) => e.currency === 'USD')
      .reduce((s, e) => s + e.amount, 0)
    const expenseInr = state.expenses
      .filter((e) => e.currency === 'INR')
      .reduce((s, e) => s + e.amount, 0)
    const tokenBurn = state.tokens.entries.reduce((s, e) => s + e.usd, 0)
    const agentBurn = state.agents.reduce((s, a) => s + a.tokenUsedUsd, 0)
    return {
      expenseUsd,
      expenseInr,
      tokenBurn,
      agentBurn,
      syncSubs,
      syncApi,
      manualUsd,
    }
  }, [state])

  return {
    state,
    ready,
    error,
    totals,
    lastSyncAt,
    globalSuggestions,
    updateAgentBudget,
    updateVenture,
    addExpense,
    removeExpense,
    addTokenEntry,
    exportState,
    importState,
    resetToSeed,
    refreshFromHost,
  }
}
