import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { ReactNode } from 'react'
import type { FleetNodeData } from '../../lib/fleetGraph'
import { clampProgress, formatProgress } from '../../lib/progress'

function statusClass(status: FleetNodeData['status']) {
  if (status === 'up' || status === 'active' || status === 'done') return 'ok'
  if (status === 'down' || status === 'parked') return 'warn'
  return 'muted'
}

function NodeShell({
  data,
  kindClass,
  children,
}: {
  data: FleetNodeData
  kindClass: string
  children?: ReactNode
}) {
  return (
    <div
      className={`fleet-node ${kindClass}${data.highlighted ? ' is-hot' : ''}${
        data.dimmed ? ' is-dim' : ''
      }`}
    >
      <Handle type="target" position={Position.Left} className="fleet-handle" />
      <Handle type="source" position={Position.Right} className="fleet-handle" />
      {children}
      <div className="fleet-node-body">
        <div className="fleet-node-top">
          <span className="fleet-node-kind">{data.kind}</span>
          {data.serviceStatus ? (
            <span className={`status-chip ${statusClass(data.serviceStatus)}`}>
              {data.serviceStatus}
            </span>
          ) : data.status ? (
            <span className={`status-chip ${statusClass(data.status)}`}>{data.status}</span>
          ) : null}
        </div>
        <strong className="fleet-node-label">{data.label}</strong>
        {data.subtitle ? <span className="fleet-node-sub">{data.subtitle}</span> : null}
        {data.progress != null ? (
          <div className="fleet-node-progress">
            <div
              className="fleet-node-progress-bar"
              style={{ width: `${clampProgress(data.progress)}%` }}
            />
            <span>{formatProgress(data.progress)}</span>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function HubNode({ data }: NodeProps) {
  return (
    <NodeShell data={data as FleetNodeData} kindClass="fleet-node-hub">
      <div className="fleet-node-crown" aria-hidden>
        ⌖
      </div>
    </NodeShell>
  )
}

export function VentureNode({ data }: NodeProps) {
  return <NodeShell data={data as FleetNodeData} kindClass="fleet-node-venture" />
}

export function AgentNode({ data }: NodeProps) {
  return <NodeShell data={data as FleetNodeData} kindClass="fleet-node-agent" />
}

export function ServiceNode({ data }: NodeProps) {
  return <NodeShell data={data as FleetNodeData} kindClass="fleet-node-service" />
}

export function SkillNode({ data }: NodeProps) {
  return <NodeShell data={data as FleetNodeData} kindClass="fleet-node-skill" />
}

export const fleetNodeTypes = {
  hub: HubNode,
  venture: VentureNode,
  agent: AgentNode,
  service: ServiceNode,
  skill: SkillNode,
}
