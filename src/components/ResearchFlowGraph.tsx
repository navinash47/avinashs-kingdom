import { useMemo } from 'react'
import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  fallbackTalkGraph,
  layoutTalkGraph,
  parseMermaidFlow,
  type TalkGraph,
} from '../lib/researchGraph'

type TalkData = { label: string; subtitle?: string }

function TalkNode({ data }: NodeProps<Node<TalkData>>) {
  return (
    <div className="research-talk-node">
      <Handle type="target" position={Position.Left} className="fleet-handle" />
      {data.subtitle ? <span className="file-talk-id">{data.subtitle}</span> : null}
      <strong>{data.label}</strong>
      <Handle type="source" position={Position.Right} className="fleet-handle" />
    </div>
  )
}

const nodeTypes = { talk: TalkNode }

function toFlow(graph: TalkGraph): { nodes: Node<TalkData>[]; edges: Edge[] } {
  const laid = layoutTalkGraph(graph)
  return {
    nodes: laid.nodes.map((n) => ({
      id: n.id,
      type: 'talk',
      position: laid.positions[n.id] ?? { x: 0, y: 0 },
      data: { label: n.label, subtitle: n.id },
    })),
    edges: laid.edges.map((e, i) => ({
      id: `e-${e.from}-${e.to}-${i}`,
      source: e.from,
      target: e.to,
      label: e.label,
      type: 'smoothstep',
    })),
  }
}

function ResearchFlowInner({
  mermaid,
  fallback,
}: {
  mermaid?: string | null
  fallback: TalkGraph
}) {
  const { nodes, edges } = useMemo(() => {
    const parsed = mermaid ? parseMermaidFlow(mermaid) : { nodes: [], edges: [] }
    const graph = parsed.nodes.length ? parsed : fallback
    return toFlow(graph)
  }, [mermaid, fallback])

  if (!nodes.length) {
    return (
      <p className="muted tiny">
        No file graph yet — add a mermaid flowchart to the architecture wiki.
      </p>
    )
  }

  return (
    <div className="research-flow-canvas" role="figure" aria-label="How files talk">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.35}
        maxZoom={1.6}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
      >
        <Background gap={20} size={1} color="rgba(255,255,255,0.06)" />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  )
}

export function ResearchFlowGraph({
  mermaid,
  name,
  field,
  experiments,
  videos,
}: {
  mermaid?: string | null
  name: string
  field?: string
  experiments?: { summary: string; source?: string }[]
  videos?: string[]
}) {
  const fallback = useMemo(
    () => fallbackTalkGraph({ name, field, experiments, videos }),
    [name, field, experiments, videos],
  )
  return (
    <ReactFlowProvider>
      <p className="eyebrow">How files talk</p>
      <ResearchFlowInner mermaid={mermaid} fallback={fallback} />
    </ReactFlowProvider>
  )
}
