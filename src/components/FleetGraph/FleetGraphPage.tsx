import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
  type NodeMouseHandler,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type {
  Agent,
  ArchitectureBundle,
  SkillGraph,
  Venture,
  VentureRegistry,
} from '../../types'
import {
  buildFleetGraph,
  type FleetNodeData,
} from '../../lib/fleetGraph'
import {
  serviceForVenture,
  startService,
  stopService,
} from '../../lib/orchestratorApi'
import { copyText } from '../../lib/ventureUtils'
import { useOrchestrator } from '../../context/OrchestratorContext'
import { useServiceStatus } from '../../hooks/useServiceStatus'
import { useShareMode } from '../../hooks/useShareMode'
import { fleetNodeTypes } from './nodes'
import { NodeInspector } from './NodeInspector'

type Props = {
  ventures: Venture[]
  agents: Agent[]
  registry: VentureRegistry | null
  skillGraph: SkillGraph | null
  architecture: Record<string, ArchitectureBundle>
  focusNodeId?: string | null
}

function FleetGraphInner({
  ventures,
  agents,
  registry,
  skillGraph,
  architecture,
  focusNodeId,
}: Props) {
  const { openVenture, setMainTab, setGraphNodeId } = useOrchestrator()
  const shareMode = useShareMode()
  const { services, refresh } = useServiceStatus()
  const { fitView, setCenter, getNode } = useReactFlow()

  const [showAgents, setShowAgents] = useState(true)
  const [showServices, setShowServices] = useState(true)
  const [showSkills, setShowSkills] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(focusNodeId ?? null)
  const [busy, setBusy] = useState(false)
  const [hoverId, setHoverId] = useState<string | null>(null)

  const built = useMemo(
    () =>
      buildFleetGraph({
        registry,
        ventures,
        agents,
        skillGraph,
        services,
        architecture,
        layers: { agents: showAgents, services: showServices, skills: showSkills },
        highlightQuery: query,
      }),
    [
      registry,
      ventures,
      agents,
      skillGraph,
      services,
      architecture,
      showAgents,
      showServices,
      showSkills,
      query,
    ],
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(built.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(built.edges)

  useEffect(() => {
    setNodes(built.nodes)
    setEdges(built.edges)
  }, [built, setNodes, setEdges])

  useEffect(() => {
    if (!focusNodeId) return
    setSelectedId(focusNodeId)
    const t = window.setTimeout(() => {
      const n = getNode(focusNodeId)
      if (n) {
        setCenter(n.position.x + 80, n.position.y + 40, { zoom: 1.15, duration: 400 })
      }
    }, 120)
    return () => window.clearTimeout(t)
  }, [focusNodeId, getNode, setCenter])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedId(null)
        setGraphNodeId(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setGraphNodeId])

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedId) ?? null,
    [nodes, selectedId],
  )
  const selectedData = (selectedNode?.data as FleetNodeData | undefined) ?? null

  const selectedService = useMemo(() => {
    if (!selectedData) return null
    if (selectedData.port != null) {
      return services.find((s) => s.port === selectedData.port) ?? null
    }
    if (selectedData.serviceName) {
      return services.find((s) => s.name === selectedData.serviceName) ?? null
    }
    if (selectedData.ventureId) {
      return serviceForVenture(services, selectedData.ventureId)
    }
    return null
  }, [selectedData, services])

  const displayEdges = useMemo(() => {
    if (!hoverId && !selectedId) return edges
    const focus = hoverId || selectedId
    return edges.map((e) => {
      const hot = e.source === focus || e.target === focus
      return {
        ...e,
        animated: hot || e.animated,
        style: {
          ...e.style,
          stroke: hot ? 'var(--brass)' : undefined,
          opacity: hot ? 1 : 0.25,
          strokeWidth: hot ? 2.5 : 1,
        },
      }
    })
  }, [edges, hoverId, selectedId])

  const onNodeClick: NodeMouseHandler = useCallback(
    (_e, node) => {
      setSelectedId(node.id)
      setGraphNodeId(node.id)
    },
    [setGraphNodeId],
  )

  const onNodeDoubleClick: NodeMouseHandler = useCallback(
    (_e, node) => {
      const data = node.data as FleetNodeData
      if (data.ventureId) {
        setMainTab('ventures')
        openVenture(data.ventureId, 'run')
      }
    },
    [openVenture, setMainTab],
  )

  const onNodeMouseEnter: NodeMouseHandler = useCallback((_e, node) => {
    setHoverId(node.id)
  }, [])

  const onNodeMouseLeave: NodeMouseHandler = useCallback(() => {
    setHoverId(null)
  }, [])

  async function handleStart() {
    const name = selectedData?.serviceName || selectedService?.name
    if (!name) return
    setBusy(true)
    try {
      await startService(name)
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  async function handleStop() {
    const name = selectedData?.serviceName || selectedService?.name
    if (!name) return
    setBusy(true)
    try {
      await stopService(name)
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fleet-graph-page">
      <div className="fleet-graph-toolbar">
        <div>
          <h2>Fleet graph</h2>
          <p className="muted tiny">
            How ventures, agents, and dashboards connect to the venture fleet control plane. Click a node ·
            double-click a venture to open Run.
          </p>
        </div>
        <div className="fleet-graph-controls">
          <input
            className="fleet-graph-search"
            placeholder="Search nodes…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <label className="fleet-layer-toggle">
            <input
              type="checkbox"
              checked={showAgents}
              onChange={(e) => setShowAgents(e.target.checked)}
            />
            Agents
          </label>
          <label className="fleet-layer-toggle">
            <input
              type="checkbox"
              checked={showServices}
              onChange={(e) => setShowServices(e.target.checked)}
            />
            Services
          </label>
          <label className="fleet-layer-toggle">
            <input
              type="checkbox"
              checked={showSkills}
              onChange={(e) => setShowSkills(e.target.checked)}
            />
            Skills
          </label>
          <button type="button" className="btn tiny-btn" onClick={() => void fitView({ duration: 300 })}>
            Fit
          </button>
        </div>
      </div>

      <div className="fleet-graph-stage">
        <div className="fleet-graph-canvas">
          <ReactFlow
            nodes={nodes as Node<FleetNodeData>[]}
            edges={displayEdges as Edge[]}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={fleetNodeTypes}
            onNodeClick={onNodeClick}
            onNodeDoubleClick={onNodeDoubleClick}
            onNodeMouseEnter={onNodeMouseEnter}
            onNodeMouseLeave={onNodeMouseLeave}
            onPaneClick={() => {
              setSelectedId(null)
              setGraphNodeId(null)
            }}
            fitView
            minZoom={0.35}
            maxZoom={1.8}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={48} size={1} color="rgba(61, 255, 194, 0.08)" />
            <Controls showInteractive={!shareMode} />
            <MiniMap
              pannable
              zoomable
              nodeColor={(n) => {
                const k = (n.data as FleetNodeData | undefined)?.kind
                if (k === 'hub') return '#3dffc2'
                if (k === 'venture') return '#1aa884'
                if (k === 'agent') return '#e8a54b'
                if (k === 'service') return '#9bb4b8'
                return '#143241'
              }}
            />
          </ReactFlow>
        </div>

        {selectedData ? (
          <NodeInspector
            data={selectedData}
            service={selectedService}
            readOnly={shareMode}
            busy={busy}
            onClose={() => {
              setSelectedId(null)
              setGraphNodeId(null)
            }}
            onOpenVenture={(tab) => {
              if (!selectedData.ventureId) return
              openVenture(selectedData.ventureId, tab)
            }}
            onStart={() => void handleStart()}
            onStop={() => void handleStop()}
            onCopyUrl={() => {
              if (selectedData.port != null) {
                void copyText(`http://127.0.0.1:${selectedData.port}/`)
              }
            }}
          />
        ) : null}
      </div>
    </div>
  )
}

export function FleetGraphPage(props: Props) {
  return (
    <ReactFlowProvider>
      <FleetGraphInner {...props} />
    </ReactFlowProvider>
  )
}
