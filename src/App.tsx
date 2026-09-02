import { useEffect, useMemo, useRef } from 'react'
import { AgentRoster } from './components/AgentRoster'
import { AnalyticsPanel } from './components/AnalyticsPanel'
import { CommandPalette } from './components/CommandPalette'
import { ExpensesLedger } from './components/ExpensesLedger'
import { MacStorageAuditPanel } from './components/MacStorageAuditPanel'
import { ResumeKnowledgePanel } from './components/ResumeKnowledgePanel'
import { SegmentedControl } from './components/SegmentedControl'
import { SubscriptionAuditPanel } from './components/SubscriptionAuditPanel'
import { ThroneOverview } from './components/ThroneOverview'
import { TokenMaxxing } from './components/TokenMaxxing'
import { VentureSidebar } from './components/VentureSidebar'
import { ShareBanner } from './components/ShareBanner'
import { bumpMirrorRefresh } from './lib/mirrorRefresh'
import { VenturePage } from './components/VenturePage'
import { FleetGraphPage } from './components/FleetGraph/FleetGraphPage'
import { ResearchLab } from './components/ResearchLab'
import { OrchestratorProvider, useOrchestrator } from './context/OrchestratorContext'
import { useKingdomState } from './hooks/useKingdomState'
import { useShareMode } from './hooks/useShareMode'
import type { InspectorTab } from './types'
import './App.css'

const NAV = [
  { id: 'throne', label: 'Throne' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'graph', label: 'Graph' },
  { id: 'research', label: 'Research' },
  { id: 'ventures', label: 'Ventures' },
  { id: 'resume', label: 'Resume' },
  { id: 'tokens', label: 'Tokens' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'subs', label: 'Subs' },
  { id: 'storage', label: 'Storage' },
  { id: 'agents', label: 'Agents' },
]

function KingdomApp() {
  const {
    state,
    ready,
    error,
    totals,
    updateAgentBudget,
    addExpense,
    removeExpense,
    addTokenEntry,
    exportState,
    importState,
    resetToSeed,
    lastSyncAt,
    globalSuggestions,
    refreshFromHost,
  } = useKingdomState()
  const {
    mainTab,
    setMainTab,
    selectedVentureId,
    setPaletteOpen,
    openVenture,
    graphNodeId,
    focusGraphNode,
  } = useOrchestrator()
  const shareMode = useShareMode()
  const fileRef = useRef<HTMLInputElement>(null)
  const autoSelectedRef = useRef(false)

  const selectedVenture = useMemo(
    () => state?.ventures.find((v) => v.id === selectedVentureId) ?? null,
    [state, selectedVentureId],
  )

  const selectedAgent = useMemo(
    () =>
      selectedVenture?.agentId
        ? state?.agents.find((a) => a.id === selectedVenture.agentId) ?? null
        : null,
    [state, selectedVenture],
  )

  const registryEntry = useMemo(
    () =>
      state?.registry?.ventures.find((v) => v.id === selectedVentureId) ?? null,
    [state, selectedVentureId],
  )

  useEffect(() => {
    if (!state || autoSelectedRef.current || mainTab !== 'ventures') return
    if (selectedVentureId) return
    const firstP0 = state.ventures.find(
      (v) => v.priority === 'P0' && v.status === 'active',
    )
    if (firstP0) {
      autoSelectedRef.current = true
      openVenture(firstP0.id, 'run')
    }
  }, [state, mainTab, selectedVentureId, openVenture])

  if (!ready) {
    return (
      <div className="boot">
        <p>Opening the Kingdom…</p>
      </div>
    )
  }

  if (error || !state || !totals) {
    return (
      <div className="boot">
        <p>Failed to load: {error ?? 'unknown'}</p>
      </div>
    )
  }

  return (
    <div className="kingdom">
      <ShareBanner lastSyncAt={lastSyncAt} onRefreshMirror={refreshFromHost} />
      <header className="hero-bar">
        <div>
          <p className="eyebrow">{shareMode ? 'Live guest view' : 'Virtual control plane'}</p>
          <h1>AVINASH&apos;S KINGDOM</h1>
          <p className="tagline">
            {shareMode
              ? 'Read-only mirror — use Refresh mirror to sync with the host'
              : 'Orchestrate every venture · sync refreshes this surface'}
          </p>
        </div>
        {shareMode ? (
          <div className="hero-actions">
            <button
              type="button"
              className="btn primary"
              onClick={() =>
                void refreshFromHost().then(() => bumpMirrorRefresh())
              }
            >
              Refresh mirror
            </button>
          </div>
        ) : (
          <div className="hero-actions">
            <button type="button" className="btn primary" onClick={() => setPaletteOpen(true)}>
              ⌘K Command
            </button>
            <button type="button" className="btn" onClick={exportState}>
              Export
            </button>
            <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
              Import
            </button>
            <button type="button" className="btn ghost" onClick={resetToSeed}>
              Reset seed
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void importState(f)
              }}
            />
          </div>
        )}
      </header>

      <nav className="top-nav">
        <SegmentedControl options={NAV} value={mainTab} onChange={setMainTab} />
      </nav>

      <div
        className={`main-layout${mainTab === 'ventures' ? ' venture-workspace' : ''}${
          mainTab === 'graph' ? ' graph-workspace' : ''
        }`}
      >
        {mainTab === 'ventures' ? (
          <>
            <VentureSidebar ventures={state.ventures} selectedId={selectedVentureId} />
            <main className="main venture-main">
              {selectedVenture ? (
                <VenturePage
                  venture={selectedVenture}
                  agent={selectedAgent}
                  registryEntry={registryEntry}
                  manifest={
                    selectedVentureId ? state.manifests[selectedVentureId] ?? null : null
                  }
                  architecture={
                    selectedVentureId
                      ? state.architecture[selectedVentureId] ?? null
                      : null
                  }
                  experiments={
                    selectedVentureId
                      ? state.experiments[selectedVentureId] ?? null
                      : null
                  }
                  cicd={selectedVentureId ? state.cicd[selectedVentureId] ?? null : null}
                  whatsapp={state.whatsapp}
                  lastSyncAt={lastSyncAt}
                  globalSuggestions={globalSuggestions}
                  onRefresh={() => window.location.reload()}
                />
              ) : (
                <div className="venture-pick panel">
                  <h2>Select a venture</h2>
                  <p className="muted">Pick from the sidebar or press ⌘K</p>
                </div>
              )}
            </main>
          </>
        ) : (
          <main className={`main${mainTab === 'graph' ? ' main-graph' : ''}`}>
            {mainTab === 'throne' && (
              <ThroneOverview
                state={state}
                expenseUsd={totals.expenseUsd}
                tokenBurn={totals.tokenBurn}
                syncSubs={totals.syncSubs}
                syncApi={totals.syncApi}
                manualUsd={totals.manualUsd}
                manifests={state.manifests}
                cicd={state.cicd}
                lastSyncAt={lastSyncAt}
                onSynced={refreshFromHost}
              />
            )}
            {mainTab === 'analytics' && (
              <AnalyticsPanel
                ventures={state.ventures}
                expenses={state.expenses}
                cicd={state.cicd}
              />
            )}
            {mainTab === 'graph' && (
              <FleetGraphPage
                ventures={state.ventures}
                agents={state.agents}
                registry={state.registry}
                skillGraph={state.skillGraph}
                architecture={state.architecture}
                focusNodeId={graphNodeId}
              />
            )}
            {mainTab === 'research' && (
              <ResearchLab
                onOpenVenture={(id, tab) =>
                  openVenture(id, (tab as InspectorTab | undefined) ?? 'experiments')
                }
                onOpenGraph={(id) => focusGraphNode(id)}
                onOpenExpenses={() => setMainTab('expenses')}
              />
            )}
            {mainTab === 'resume' && (
              <ResumeKnowledgePanel
                data={state.resumeKnowledge}
                portfolio={state.portfolioRepo}
              />
            )}
            {mainTab === 'tokens' && (
              <TokenMaxxing
                tokens={state.tokens}
                ventures={state.ventures}
                agents={state.agents}
                onAdd={addTokenEntry}
              />
            )}
            {mainTab === 'expenses' && (
              <ExpensesLedger
                expenses={state.expenses}
                ventures={state.ventures}
                subAnnualHint={state.subscription?.annual_estimate}
                onAdd={addExpense}
                onRemove={removeExpense}
              />
            )}
            {mainTab === 'subs' && <SubscriptionAuditPanel data={state.subscription} />}
            {mainTab === 'storage' && <MacStorageAuditPanel data={state.mac} />}
            {mainTab === 'agents' && (
              <AgentRoster
                agents={state.agents}
                ventures={state.ventures}
                skillGraph={state.skillGraph}
                tokens={state.tokens}
                onBudget={updateAgentBudget}
              />
            )}
          </main>
        )}
      </div>

      <CommandPalette
        ventures={state.ventures}
        agents={state.agents}
        registry={state.registry?.ventures ?? []}
      />

      <footer className="foot">
        <span>Kingdom v2.2 · virtual control plane</span>
        <span className="muted">
          ⌘K · Throne = fleet control · sync refreshes this surface
          {lastSyncAt ? ` · synced ${new Date(lastSyncAt).toLocaleString()}` : ''}
        </span>
      </footer>
    </div>
  )
}

function App() {
  return (
    <OrchestratorProvider>
      <KingdomApp />
    </OrchestratorProvider>
  )
}

export default App
