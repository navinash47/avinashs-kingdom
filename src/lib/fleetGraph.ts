import type { Edge, Node } from '@xyflow/react'
import type {
  Agent,
  ArchitectureBundle,
  SkillGraph,
  Venture,
  VentureRegistry,
  VentureRegistryEntry,
} from '../types'
import type { ServiceStatus } from './orchestratorApi'

export type FleetNodeKind = 'hub' | 'venture' | 'agent' | 'service' | 'skill'

export type FleetLayer = 'agents' | 'services' | 'skills'

export type FleetNodeData = {
  kind: FleetNodeKind
  label: string
  subtitle?: string
  blurb: string
  ventureId?: string | null
  agentId?: string | null
  serviceName?: string | null
  port?: number | null
  progress?: number | null
  priority?: string | null
  status?: 'up' | 'down' | 'unknown' | 'active' | 'parked' | 'done' | null
  /** Live dashboard UP/DOWN when this venture has a service. */
  serviceStatus?: 'up' | 'down' | null
  github?: string | null
  nextMilestone?: string | null
  highlighted?: boolean
  dimmed?: boolean
}

export type FleetGraphInput = {
  registry: VentureRegistry | null
  ventures: Venture[]
  agents: Agent[]
  skillGraph: SkillGraph | null
  services: ServiceStatus[]
  architecture: Record<string, ArchitectureBundle>
  layers: { agents: boolean; services: boolean; skills: boolean }
  highlightQuery?: string
}

const HUB_ID = 'hub:kingdom'
const CX = 520
const CY = 380
const VENTURE_R = 260
const OUTER_R = 420

function clip(text: string, max = 280) {
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

function archBlurb(arch: ArchitectureBundle | undefined): string | null {
  if (!arch?.sections) return null
  const entry = Object.entries(arch.sections).find(([k]) =>
    k.toLowerCase().includes('system design'),
  )
  const md = entry?.[1]?.markdown || entry?.[1]?.content
  return md ? clip(md) : null
}

function serviceForVenture(
  services: ServiceStatus[],
  entry: VentureRegistryEntry,
): ServiceStatus | null {
  if (entry.dashboard?.port != null) {
    const byPort = services.find((s) => s.port === entry.dashboard!.port)
    if (byPort) return byPort
  }
  return services.find((s) => s.ventureId === entry.id) ?? null
}

function polar(cx: number, cy: number, r: number, angleRad: number) {
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) }
}

export function buildFleetGraph(input: FleetGraphInput): {
  nodes: Node<FleetNodeData>[]
  edges: Edge[]
} {
  const {
    registry,
    ventures,
    agents,
    skillGraph,
    services,
    architecture,
    layers,
    highlightQuery = '',
  } = input

  const q = highlightQuery.trim().toLowerCase()
  const match = (...parts: (string | null | undefined)[]) => {
    if (!q) return false
    return parts.some((p) => (p ?? '').toLowerCase().includes(q))
  }

  const entries = registry?.ventures?.length
    ? registry.ventures
    : ventures.map(
        (v): VentureRegistryEntry => ({
          id: v.id,
          repoPath: v.repoPath,
          agentId: v.agentId,
          dashboard: null,
          wiki: {},
          paths: {},
          github: null,
          tests: { commands: [] },
        }),
      )

  const ventureById = new Map(ventures.map((v) => [v.id, v]))
  const agentById = new Map(agents.map((a) => [a.id, a]))

  const nodes: Node<FleetNodeData>[] = []
  const edges: Edge[] = []

  nodes.push({
    id: HUB_ID,
    type: 'hub',
    position: { x: CX - 90, y: CY - 50 },
    data: {
      kind: 'hub',
      label: "Venture Fleet Control Plane",
      subtitle: 'Orchestrator',
      blurb:
        'React + Vite command center. Syncs venture STATUS/phases into public/data, embeds dashboards, and runs Start/Stop/Test/Sync. Friend share uses Cloudflare tunnels; guests stay read-only.',
      ventureId: 'kingdom-ops',
      status: 'up',
      highlighted: match('kingdom', 'orchestrator', 'hub'),
    },
  })

  const n = Math.max(entries.length, 1)
  entries.forEach((entry, i) => {
    const angle = -Math.PI / 2 + (i / n) * Math.PI * 2
    const pos = polar(CX, CY, VENTURE_R, angle)
    const v = ventureById.get(entry.id)
    const blurb =
      archBlurb(architecture[entry.id]) ||
      clip(v?.notes || v?.nextMilestone || `${entry.id} venture`)
    const svc = serviceForVenture(services, entry)
    const nodeId = `venture:${entry.id}`
    const gh = entry.github
      ? `${entry.github.owner}/${entry.github.repo}`
      : null

    nodes.push({
      id: nodeId,
      type: 'venture',
      position: { x: pos.x - 80, y: pos.y - 36 },
      data: {
        kind: 'venture',
        label: v?.name ?? entry.id,
        subtitle:
          entry.kind === 'research'
            ? `research · ${v?.version ?? entry.field ?? entry.id}`
            : (v?.version ?? entry.id),
        blurb,
        ventureId: entry.id,
        agentId: entry.agentId,
        port: entry.dashboard?.port ?? svc?.port ?? null,
        progress: v?.progress ?? null,
        priority: v?.priority ?? null,
        status: (v?.status as FleetNodeData['status']) ?? 'unknown',
        serviceStatus: svc?.status ?? null,
        github: gh,
        nextMilestone: v?.nextMilestone ?? null,
        highlighted: match(v?.name, entry.id, v?.nextMilestone, gh),
      },
    })

    edges.push({
      id: `e-${HUB_ID}-${nodeId}`,
      source: HUB_ID,
      target: nodeId,
      type: 'smoothstep',
      animated: entry.id === 'kingdom-ops',
      label: entry.id === 'kingdom-ops' ? 'self' : 'sync',
    })

    if (layers.agents && entry.agentId) {
      const agent = agentById.get(entry.agentId)
      const agentId = `agent:${entry.agentId}`
      if (!nodes.some((n) => n.id === agentId)) {
        const aPos = polar(CX, CY, OUTER_R, angle - 0.18)
        nodes.push({
          id: agentId,
          type: 'agent',
          position: { x: aPos.x - 70, y: aPos.y - 28 },
          data: {
            kind: 'agent',
            label: agent?.name ?? entry.agentId,
            subtitle: 'Agent',
            blurb: clip(agent?.focus || 'Venture agent'),
            ventureId: entry.id,
            agentId: entry.agentId,
            status: 'active',
            highlighted: match(agent?.name, entry.agentId, agent?.focus),
          },
        })
      }
      edges.push({
        id: `e-${nodeId}-${agentId}`,
        source: nodeId,
        target: agentId,
        type: 'smoothstep',
        label: 'agent',
      })

      if (layers.skills && skillGraph) {
        const sgAgent = skillGraph.agents.find((a) => a.id === entry.agentId)
        const skills = sgAgent?.skills ?? []
        skills.slice(0, 4).forEach((skill, si) => {
          const skillId = `skill:${skill}`
          if (!nodes.some((n) => n.id === skillId)) {
            const sPos = polar(CX, CY, OUTER_R + 90, angle - 0.35 + si * 0.12)
            nodes.push({
              id: skillId,
              type: 'skill',
              position: { x: sPos.x - 60, y: sPos.y - 20 },
              data: {
                kind: 'skill',
                label: skill,
                subtitle: 'Skill',
                blurb: `Cursor skill used by ${agent?.name ?? entry.agentId}.`,
                agentId: entry.agentId,
                highlighted: match(skill),
              },
            })
          }
          edges.push({
            id: `e-${agentId}-${skillId}`,
            source: agentId,
            target: skillId,
            type: 'smoothstep',
            label: 'skill',
          })
        })
      }
    }

    if (layers.services && (entry.dashboard || svc)) {
      const port = entry.dashboard?.port ?? svc?.port
      if (port != null) {
        const serviceId = `service:${port}`
        if (!nodes.some((n) => n.id === serviceId)) {
          const sPos = polar(CX, CY, OUTER_R, angle + 0.2)
          nodes.push({
            id: serviceId,
            type: 'service',
            position: { x: sPos.x - 70, y: sPos.y - 28 },
            data: {
              kind: 'service',
              label: entry.dashboard?.label ?? svc?.label ?? `:${port}`,
              subtitle: `:${port}`,
              blurb: `Local dashboard on port ${port}. Embedded in the venture Run tab.`,
              ventureId: entry.id,
              serviceName: svc?.name ?? null,
              port,
              status: svc?.status ?? 'unknown',
              highlighted: match(String(port), entry.dashboard?.label, svc?.name),
            },
          })
        }
        edges.push({
          id: `e-${nodeId}-${serviceId}`,
          source: nodeId,
          target: serviceId,
          type: 'smoothstep',
          label: 'dashboard',
        })
      }
    }
  })

  if (q) {
    const hot = new Set(nodes.filter((n) => n.data.highlighted).map((n) => n.id))
    for (const e of edges) {
      if (hot.has(e.source) || hot.has(e.target)) {
        hot.add(e.source)
        hot.add(e.target)
      }
    }
    for (const n of nodes) {
      n.data = { ...n.data, dimmed: !hot.has(n.id) }
    }
  }

  return { nodes, edges }
}

export function fleetNodeVentureId(nodeId: string | null | undefined): string | null {
  if (!nodeId) return null
  if (nodeId.startsWith('venture:')) return nodeId.slice('venture:'.length)
  if (nodeId === HUB_ID) return 'kingdom-ops'
  return null
}

export { HUB_ID }
