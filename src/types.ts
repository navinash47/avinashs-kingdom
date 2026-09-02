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
  /** How progress % was computed (from sync). */
  progressSource?: string | null
  phasesPassed?: number | null
  phasesTotal?: number | null
  spendUsd?: number | null
  ceilingUsd?: number | null
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

export type MacAppGroup = {
  name: string
  count: number
  rss_bytes: number
  rss_human?: string
  cpu: number
}

export type MacProc = {
  pid: number
  name: string
  pcpu: number
  rss_bytes?: number
  rss_human?: string
}

export type MacCleaner = {
  id: string
  title: string
  risk: string
  detail?: string
  estimated_bytes?: number
  available?: boolean
}

export type MacAudit = {
  generated_at: string
  source: string
  dashboard?: string
  disk: {
    note: string
    percent_used: number
    total_bytes: number
    used_bytes: number
    free_bytes: number
  }
  memory?: {
    total_bytes: number
    total_human?: string
    used_bytes: number
    used_human?: string
    percent_used: number
    pressure?: string
    pressure_level?: number
    swap?: { used_bytes?: number; used_mb?: number; total_mb?: number }
    file_cache_human?: string
  }
  cpu?: {
    ncpu?: number
    loadavg?: number[]
    load_human?: string
  }
  health?: {
    score: number
    grade: string
    summary: string
  }
  host?: {
    uptime_days?: number
    model?: string
  }
  app_groups?: MacAppGroup[]
  top_cpu?: MacProc[]
  top_home: { path: string; bytes: number }[]
  recommendations: MacRec[]
  cleaners?: MacCleaner[]
}

export type SkillGraph = {
  synced_at: string
  skills: { id: string; path: string; has_skill_md: boolean }[]
  agents: {
    id: string
    name: string
    venture_id: string
    focus: string
    skills: string[]
    token_budget_usd: number
    token_used_usd: number
    recent_observations: { header: string; body: string; at: string | null }[]
  }[]
}

export type PortfolioRepo = {
  updated: string
  repo: string
  local_path: string
  site_url: string
  resume_repo: string
  resume_local: string
  resume_dashboard: string
  kingdom_wiki: string
  legacy_catalog?: { tracks: number; sources: number; ingest_command: string }
}

export type ResumeKnowledge = {
  updated: string
  phase: number
  repo: string
  local_path: string
  dashboard_url: string
  wiki: string
  excluded_projects: string[]
  deferred_projects?: Array<{
    id: string
    name: string
    git: string
    honesty_gate: string
    defer_reason?: string
  }>
  linkedin_url?: string
  featured_verdict?: string
  goal_checklist?: string
  role_comparison?: string
  rating_guide?: string
  featured_projects: Array<{
    id: string
    name: string
    git: string
    honesty_gate: string
  }>
  bullet_counts: Record<string, number>
  roles?: Array<{ id: string; label: string; level: string }>
  ratings_stats?: {
    rated_overall: number
    unrated_overall?: number
    total_bullets: number
    per_role: Record<string, { label: string; level: string; rated: number; total: number }>
    legacy_approvals?: { approved: number; rejected: number }
    unrated_policy?: string
  }
  approval_stats?: {
    approved: number
    rejected: number
    pending: number
    total: number
  }
  section_approvals?: Record<
    string,
    { approved: number; rejected: number; options: number }
  >
  eval_stats?: {
    updated: string | null
    sections: number
    top_consensus: Array<{ id: string; consensus: number }>
  }
  confirmed_metrics: Record<string, string>
  maturity_top5: string[]
  status: string
  dashboard_ui?: string
  preview_tex_generated?: boolean
  preview_pdfs?: Array<{ role: string; label?: string; path: string }>
  share_site_url?: string | null
  share_site_local?: string
  share_site_readme?: string
}

export type KingdomState = {
  portfolio: Portfolio
  ventures: Venture[]
  agents: Agent[]
  expenses: Expense[]
  tokens: TokensState
  subscription: SubscriptionAudit | null
  mac: MacAudit | null
  whatsapp: WhatsAppPhases | null
  phasesBoard: PhasesBoard | null
  resumeKnowledge: ResumeKnowledge | null
  portfolioRepo: PortfolioRepo | null
  registry: VentureRegistry | null
  manifests: Record<string, VentureManifest>
  architecture: Record<string, ArchitectureBundle>
  experiments: Record<string, ExperimentsBundle>
  cicd: Record<string, CicdSnapshot>
  skillGraph: SkillGraph | null
}

export type VentureRegistryEntry = {
  id: string
  repoPath: string | null
  agentId: string | null
  kind?: 'research' | string
  field?: string
  dashboard: { port: number; label: string } | null
  wiki: {
    venture?: string
    architecture?: string
    experiments?: string
  }
  paths: Record<string, string>
  github: {
    owner: string
    repo: string
    default_branch: string
  } | null
  tests: {
    commands: {
      id: string
      label: string
      cmd: string
      type: 'unit' | 'integration' | 'regression'
      description?: string
    }[]
  }
}

export type VentureRegistry = {
  version: string
  updated: string
  ventures: VentureRegistryEntry[]
}

export type DependencyEntry = {
  name: string
  version: string
  ecosystem: string
}

export type VentureManifest = {
  venture_id: string
  synced_at: string
  repo: {
    path: string
    head?: string
    branch?: string
    last_commit_at?: string
    remote_url?: string | null
    github?: { owner: string; repo: string; default_branch: string } | null
  } | null
  stats: {
    files: number
    lines: number
    primary_language: string | null
    languages: { language: string; files: number; lines: number }[]
    truncated?: boolean
    sampled_files?: number
    source?: string
  } | null
  models_tested?: { name: string; spend_usd: number; calls: number; source: string }[]
  dependencies: {
    ecosystem: string | null
    runtime: DependencyEntry[]
    dev: DependencyEntry[]
  } | null
  storage: { type: string; path: string; note: string }[]
  models_detected: { name: string; source: string }[]
  spend_usd: number | null
  ceiling_usd: number | null
  progress: number | null
  version: string | null
  test_commands: VentureRegistryEntry['tests']['commands']
  services: { id: string; label: string; port: number; url: string; status: string }[]
  suggestions: string[]
}

export type ArchitectureDiagram = {
  source: string
  svg_path: string | null
  svg_inline: string | null
}

export type ArchitectureSection = {
  title: string
  content: string
  markdown: string
  diagrams?: ArchitectureDiagram[]
  tables?: { headers: string[]; rows: string[][] }[]
}

export type ArchitectureBundle = {
  venture_id: string | null
  updated: string | null
  type: string
  sections: Record<string, ArchitectureSection>
  section_titles: string[]
  source_path: string
}

export type ExperimentItem = {
  date: string
  summary: string
  source?: 'wiki' | 'git'
  video?: string | null
}

export type ExperimentsBundle = {
  venture_id: string
  updated: string | null
  items: ExperimentItem[]
  source_path: string
}

export type CicdSnapshot = {
  venture_id: string
  synced_at: string
  github: {
    owner: string
    repo: string
    default_branch: string
    available: boolean
    runs: {
      databaseId: number
      conclusion: string | null
      status: string
      displayTitle: string
      workflowName: string
      createdAt: string
      url: string
      event: string
    }[]
    last_conclusion?: string | null
  } | null
  local_tests: {
    commands: VentureRegistryEntry['tests']['commands']
    last_run: {
      ok: boolean
      ran_at: string
      duration_ms: number
      results: { id: string; label: string; type: string; ok: boolean; duration_ms: number; error?: string }[]
    } | null
  }
}

export type InspectorTab =
  | 'run'
  | 'overview'
  | 'actions'
  | 'tech'
  | 'architecture'
  | 'data'
  | 'experiments'
  | 'models'
  | 'tests'
  | 'cicd'

export type PhasesBoardVenture = {
  id: string
  name: string
  version: string
  progress: number
  priority: string
  status: string
  nextMilestone: string
  progressSource: string | null
  phasesPassed: number | null
  phasesTotal: number | null
  spendUsd: number | null
  ceilingUsd: number | null
  notes: string
  repoPath: string | null
}

export type PhasesBoard = {
  synced_at: string
  progress_rules: Record<string, string>
  burn_rules: {
    monthly_budget_usd: string
    tracked_burn: string
    not_included: string
  }
  ventures: PhasesBoardVenture[]
}

export type WhatsAppPhaseRow = {
  id: number
  name: string
  stage: string
  status: string
  evaluation: { result: string; date?: string } | null
}

export type WhatsAppPhases = {
  synced_at: string
  source: string
  vertical: string
  ceiling_usd: number
  spend_usd: number
  current_phase: number
  stage: string | null
  stage_name: string | null
  passed: number
  total: number
  progress: number
  version: string
  next_milestone: string
  last_evaluation: {
    result: string
    measured?: string
    threshold?: string
    date?: string
  } | null
  stages: { id: string; name: string; start: number; end: number }[]
  phases: WhatsAppPhaseRow[]
}

export type CityStageProof = {
  id: string
  title: string
  status: string
  terminal: string | null
  gate: string | null
  unity_video: string | null
  poster: string | null
  duration_sec: number | null
  checklist: string | null
  unity_report: string | null
  svg?: string | null
  heatmap?: string | null
  walkthrough_skipped?: boolean | null
}

export type CityStageProofs = {
  synced_at: string
  source: string
  generated_at: string | null
  count: number
  dashboard_proofs_url?: string
  proofs: CityStageProof[]
}
