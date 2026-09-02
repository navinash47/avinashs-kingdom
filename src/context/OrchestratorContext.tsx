import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { InspectorTab } from '../types'
import { OperationLogProvider } from './OperationLogContext'

const VALID_TABS: InspectorTab[] = [
  'run',
  'overview',
  'actions',
  'tech',
  'architecture',
  'data',
  'experiments',
  'models',
  'tests',
  'cicd',
]

function parseDeepLink() {
  const params = new URLSearchParams(window.location.search)
  const main = params.get('tab')
  const venture = params.get('venture')
  const node = params.get('node')
  const inspectorTab = params.get('inspector') as InspectorTab | null

  if (main === 'graph') {
    return {
      mainTab: 'graph' as const,
      venture: null as string | null,
      inspectorTab: 'run' as InspectorTab,
      graphNodeId: node,
    }
  }

  if (main === 'research') {
    return {
      mainTab: 'research' as const,
      venture: null as string | null,
      inspectorTab: 'run' as InspectorTab,
      graphNodeId: null,
    }
  }

  if (!venture) {
    return null
  }

  return {
    mainTab: 'ventures' as const,
    venture,
    inspectorTab:
      inspectorTab && VALID_TABS.includes(inspectorTab)
        ? inspectorTab
        : main && VALID_TABS.includes(main as InspectorTab)
          ? (main as InspectorTab)
          : ('run' as InspectorTab),
    graphNodeId: null as string | null,
  }
}

function pushUrl(opts: {
  mainTab?: string
  ventureId?: string | null
  inspectorTab?: InspectorTab
  graphNodeId?: string | null
}) {
  const params = new URLSearchParams()
  if (opts.mainTab === 'graph') {
    params.set('tab', 'graph')
    if (opts.graphNodeId) params.set('node', opts.graphNodeId)
  } else if (opts.mainTab === 'research') {
    params.set('tab', 'research')
  } else if (opts.ventureId) {
    params.set('venture', opts.ventureId)
    if (opts.inspectorTab && opts.inspectorTab !== 'run') {
      params.set('tab', opts.inspectorTab)
    }
  }
  const qs = params.toString()
  const next = `${window.location.pathname}${qs ? `?${qs}` : ''}`
  window.history.replaceState(null, '', next)
}

type OrchestratorContextValue = {
  selectedVentureId: string | null
  ventureTab: InspectorTab
  paletteOpen: boolean
  selectVenture: (id: string | null) => void
  openVenture: (id: string, tab?: InspectorTab) => void
  setVentureTab: (tab: InspectorTab) => void
  setPaletteOpen: (open: boolean) => void
  mainTab: string
  setMainTab: (tab: string) => void
  graphNodeId: string | null
  setGraphNodeId: (id: string | null) => void
  focusGraphNode: (id: string) => void
  /** @deprecated use openVenture */
  openInspector: (id: string, tab?: InspectorTab) => void
  inspectorTab: InspectorTab
  setInspectorTab: (tab: InspectorTab) => void
  inspectorOpen: boolean
  closeInspector: () => void
}

const OrchestratorContext = createContext<OrchestratorContextValue | null>(null)

export function OrchestratorProvider({ children }: { children: ReactNode }) {
  const [selectedVentureId, setSelectedVentureId] = useState<string | null>(null)
  const [ventureTab, setVentureTabState] = useState<InspectorTab>('run')
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [mainTab, setMainTabState] = useState('throne')
  const [graphNodeId, setGraphNodeIdState] = useState<string | null>(null)

  const setMainTab = useCallback((tab: string) => {
    setMainTabState(tab)
    if (tab === 'graph') {
      pushUrl({ mainTab: 'graph', graphNodeId })
    } else if (tab === 'research') {
      pushUrl({ mainTab: 'research' })
    }
  }, [graphNodeId])

  const setGraphNodeId = useCallback((id: string | null) => {
    setGraphNodeIdState(id)
    pushUrl({ mainTab: 'graph', graphNodeId: id })
  }, [])

  const focusGraphNode = useCallback((id: string) => {
    setMainTabState('graph')
    setGraphNodeIdState(id)
    pushUrl({ mainTab: 'graph', graphNodeId: id })
  }, [])

  const setVentureTab = useCallback(
    (tab: InspectorTab) => {
      setVentureTabState(tab)
      if (selectedVentureId) {
        pushUrl({ ventureId: selectedVentureId, inspectorTab: tab })
      }
    },
    [selectedVentureId],
  )

  const selectVenture = useCallback((id: string | null) => {
    setSelectedVentureId(id)
  }, [])

  const openVenture = useCallback((id: string, tab: InspectorTab = 'run') => {
    setSelectedVentureId(id)
    setVentureTabState(tab)
    setMainTabState('ventures')
    pushUrl({ ventureId: id, inspectorTab: tab })
  }, [])

  const closeInspector = useCallback(() => {
    setSelectedVentureId(null)
    pushUrl({})
  }, [])

  useEffect(() => {
    const link = parseDeepLink()
    if (!link) return
    setMainTabState(link.mainTab)
    if (link.mainTab === 'graph') {
      setGraphNodeIdState(link.graphNodeId)
      return
    }
    if (link.venture) {
      setSelectedVentureId(link.venture)
      setVentureTabState(link.inspectorTab)
    }
  }, [])

  const value = useMemo(
    () => ({
      selectedVentureId,
      ventureTab,
      paletteOpen,
      selectVenture,
      openVenture,
      setVentureTab,
      setPaletteOpen,
      mainTab,
      setMainTab,
      graphNodeId,
      setGraphNodeId,
      focusGraphNode,
      openInspector: openVenture,
      inspectorTab: ventureTab,
      setInspectorTab: setVentureTab,
      inspectorOpen: !!selectedVentureId,
      closeInspector,
    }),
    [
      selectedVentureId,
      ventureTab,
      paletteOpen,
      selectVenture,
      openVenture,
      setVentureTab,
      mainTab,
      setMainTab,
      graphNodeId,
      setGraphNodeId,
      focusGraphNode,
      closeInspector,
    ],
  )

  return (
    <OperationLogProvider>
      <OrchestratorContext.Provider value={value}>{children}</OrchestratorContext.Provider>
    </OperationLogProvider>
  )
}

export function useOrchestrator() {
  const ctx = useContext(OrchestratorContext)
  if (!ctx) throw new Error('useOrchestrator must be used within OrchestratorProvider')
  return ctx
}
