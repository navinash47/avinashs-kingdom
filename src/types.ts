export type Priority = 'P0' | 'P1' | 'P2' | 'parked'
export type VentureStatus = 'active' | 'parked' | 'done'

export type Venture = {
  id: string
  name: string
  version: string
  progress: number
  priority: Priority
  status: VentureStatus
  weight: number
  agentId: string | null
  repoPath: string | null
  nextMilestone: string
  notes: string
}

export type Agent = {
  id: string
  name: string
  ventureId: string
  focus: string
  tokenBudgetUsd: number
  tokenUsedUsd: number
}

export type Expense = {
  id: string
  date: string
  category: string
  label: string
  amount: number
  currency: 'USD' | 'INR'
  ventureId: string
  notes: string
}

export type TokenEntry = {
  id: string
  date: string
  ventureId: string
  agentId: string
  label: string
  usd: number
  tokensEst: number
}

export type TokensState = {
  month: string
  capUsd: number
  tips: string[]
  entries: TokenEntry[]
}

export type PortfolioWeight = {
  ventureId: string
  weight: number
  label: string
}

export type Portfolio = {
  month: string
  currencyPrimary: string
  monthlyBudgetUsd: number
  monthlyTokenCapUsd: number
  weeklyFocus: string[]
  weights: PortfolioWeight[]
}

export type SubItem = {
  name: string
  cadence: string
  annual: string
  source: string
  cancel_url: string
}

export type SubscriptionAudit = {
  generated_from: string
  annual_estimate: string
  source_path: string
  items: SubItem[]
}

export type MacRec = {
  priority: number
  title: string
  bytes: number
  risk: string
  action: string
  rationale: string
}

export type MacAudit = {
  generated_at: string
  source: string
  disk: {
    note: string
    percent_used: number
    total_bytes: number
    used_bytes: number
    free_bytes: number
  }
  top_home: { path: string; bytes: number }[]
  recommendations: MacRec[]
}

export type KingdomState = {
  portfolio: Portfolio
  ventures: Venture[]
  agents: Agent[]
  expenses: Expense[]
  tokens: TokensState
  subscription: SubscriptionAudit | null
  mac: MacAudit | null
}
