import { useRef, useState } from 'react'
import { AgentRoster } from './components/AgentRoster'
import { ExpensesLedger } from './components/ExpensesLedger'
import { FleetGraph } from './components/FleetGraph'
import { MacStorageAuditPanel } from './components/MacStorageAuditPanel'
import { SegmentedControl } from './components/SegmentedControl'
import { SubscriptionAuditPanel } from './components/SubscriptionAuditPanel'
import { ThroneOverview } from './components/ThroneOverview'
import { TokenMaxxing } from './components/TokenMaxxing'
import { VentureBoard } from './components/VentureBoard'
import { ResearchLab } from './components/ResearchLab'
import { useKingdomState } from './hooks/useKingdomState'
import './App.css'

const NAV = [
  { id: 'throne', label: 'Throne' },
  { id: 'ventures', label: 'Ventures' },
  { id: 'research', label: 'Research' },
  { id: 'graph', label: 'Fleet' },
  { id: 'tokens', label: 'Tokens' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'subs', label: 'Subs' },
  { id: 'storage', label: 'Storage' },
  { id: 'agents', label: 'Agents' },
]

function App() {
  const {
    state,
    ready,
    error,
    totals,
    updateVenture,
    updateAgentBudget,
    addExpense,
    removeExpense,
    addTokenEntry,
    exportState,
    importState,
    resetToSeed,
    lastSyncAt,
  } = useKingdomState()
  const [tab, setTab] = useState(() => {
    const q = new URLSearchParams(window.location.search).get('tab')
    const ok = [
      'throne',
      'ventures',
      'research',
      'graph',
      'tokens',
      'expenses',
      'subs',
      'storage',
      'agents',
    ]
    return q && ok.includes(q) ? q : 'throne'
  })
  const [focusVentureId, setFocusVentureId] = useState<string | null>(null)
  const [focusGraphNode, setFocusGraphNode] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

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
      <header className="hero-bar">
        <div>
          <p className="eyebrow">Command center</p>
          <h1>AVINASH&apos;S KINGDOM</h1>
          <p className="tagline">
            Track ventures · max tokens · cut burn · push frontiers
          </p>
        </div>
        <div className="hero-actions">
          <button type="button" className="btn" onClick={exportState}>
            Export
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => fileRef.current?.click()}
          >
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
      </header>

      <nav className="top-nav">
        <SegmentedControl options={NAV} value={tab} onChange={setTab} />
      </nav>

      <main className="main">
        {tab === 'throne' && (
          <ThroneOverview
            state={state}
            expenseUsd={totals.expenseUsd}
            tokenBurn={totals.tokenBurn}
          />
        )}
        {tab === 'ventures' && (
          <VentureBoard
            ventures={state.ventures}
            agents={state.agents}
            focusId={focusVentureId}
            onUpdate={updateVenture}
          />
        )}
        {tab === 'research' && (
          <ResearchLab
            onOpenVenture={(id) => {
              setFocusVentureId(id)
              setTab('ventures')
            }}
            onOpenGraph={(nodeId) => {
              setFocusGraphNode(nodeId)
              setTab('graph')
            }}
            onOpenExpenses={() => setTab('expenses')}
          />
        )}
        {tab === 'graph' && (
          <FleetGraph
            agents={state.agents}
            ventures={state.ventures}
            focusNode={focusGraphNode}
          />
        )}
        {tab === 'tokens' && (
          <TokenMaxxing
            tokens={state.tokens}
            ventures={state.ventures}
            agents={state.agents}
            onAdd={addTokenEntry}
          />
        )}
        {tab === 'expenses' && (
          <ExpensesLedger
            expenses={state.expenses}
            ventures={state.ventures}
            subAnnualHint={state.subscription?.annual_estimate}
            onAdd={addExpense}
            onRemove={removeExpense}
          />
        )}
        {tab === 'subs' && (
          <SubscriptionAuditPanel data={state.subscription} />
        )}
        {tab === 'storage' && <MacStorageAuditPanel data={state.mac} />}
        {tab === 'agents' && (
          <AgentRoster
            agents={state.agents}
            ventures={state.ventures}
            onBudget={updateAgentBudget}
          />
        )}
      </main>

      <footer className="foot">
        <span>Kingdom v1.0</span>
        <span className="muted">
          P0 this week: WhatsApp Voice + YouTube · Research 15% · City before Comic
          {lastSyncAt
            ? ` · synced ${new Date(lastSyncAt).toLocaleString()}`
            : ' · run npm run sync'}
        </span>
      </footer>
    </div>
  )
}

export default App
