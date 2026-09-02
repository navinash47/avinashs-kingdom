/**
 * Virtual control surface snapshot — written on every Kingdom sync.
 * Consumed by Throne / ControlSurfaceBar and brain/harness empty-model.
 * Includes portable OS onboarding pointer (venture-template.json).
 */
import fs from 'node:fs'
import path from 'node:path'
import { loadVentureTemplate } from './registry.mjs'

function writeJson(p, value) {
  fs.mkdirSync(path.dirname(p), { recursive: true })
  fs.writeFileSync(p, JSON.stringify(value, null, 2) + '\n')
}

/**
 * @param {object} opts
 * @param {string} opts.dataDir
 * @param {object} opts.registry
 * @param {object[]} opts.ventures
 * @param {object|null} opts.skillGraph
 * @param {object|null} opts.phasesBoard
 */
export function syncControlSurface({
  dataDir,
  registry,
  ventures,
  skillGraph,
  phasesBoard,
}) {
  const syncedAt = new Date().toISOString()
  const entries = registry?.ventures ?? []
  const ventureById = new Map((ventures ?? []).map((v) => [v.id, v]))

  const surfaceVentures = entries.map((entry) => {
    const v = ventureById.get(entry.id)
    return {
      id: entry.id,
      name: v?.name ?? entry.id,
      progress: v?.progress ?? 0,
      priority: v?.priority ?? 'parked',
      status: v?.status ?? 'parked',
      agentId: entry.agentId ?? v?.agentId ?? null,
      repoPath: entry.repoPath ?? v?.repoPath ?? null,
      dashboardPort: entry.dashboard?.port ?? null,
      dashboardLabel: entry.dashboard?.label ?? null,
      nextMilestone: v?.nextMilestone ?? null,
      phasesPassed: v?.phasesPassed ?? null,
      phasesTotal: v?.phasesTotal ?? null,
      kind: entry.kind ?? null,
      github: entry.github
        ? `${entry.github.owner}/${entry.github.repo}`
        : null,
    }
  })

  const nodes = [
    { id: 'hub:kingdom', type: 'orchestrator', label: 'Venture Fleet Control Plane' },
    ...surfaceVentures.map((v) => ({
      id: `venture:${v.id}`,
      type: 'venture',
      label: v.name,
      venture_id: v.id,
    })),
  ]

  const edges = []
  for (const v of surfaceVentures) {
    edges.push({
      id: `e-hub-venture:${v.id}`,
      from: 'hub:kingdom',
      to: `venture:${v.id}`,
      rel: 'sync',
    })
    if (v.agentId) {
      const agentNode = `agent:${v.agentId}`
      if (!nodes.some((n) => n.id === agentNode)) {
        nodes.push({
          id: agentNode,
          type: 'agent',
          label: v.agentId,
          venture_id: v.id,
        })
      }
      edges.push({
        id: `e-venture:${v.id}-${agentNode}`,
        from: `venture:${v.id}`,
        to: agentNode,
        rel: 'agent',
      })
    }
  }

  const skillIds = (skillGraph?.skills ?? []).map((s) => s.id)
  for (const a of skillGraph?.agents ?? []) {
    const agentNode = `agent:${a.id}`
    if (!nodes.some((n) => n.id === agentNode)) {
      nodes.push({
        id: agentNode,
        type: 'agent',
        label: a.name ?? a.id,
        venture_id: a.venture_id ?? null,
      })
    }
    for (const skill of a.skills ?? []) {
      const skillNode = `skill:${skill}`
      if (!nodes.some((n) => n.id === skillNode)) {
        nodes.push({ id: skillNode, type: 'skill', label: skill })
      }
      edges.push({
        id: `e-${agentNode}-${skillNode}`,
        from: agentNode,
        to: skillNode,
        rel: 'skill',
      })
    }
  }

  // Capability nodes: explicit registry.capabilities[] or inferred dashboard/tests.
  for (const entry of entries) {
    const caps = Array.isArray(entry.capabilities) ? [...entry.capabilities] : []
    if (entry.dashboard?.port != null) {
      caps.push(`dashboard:${entry.dashboard.port}`)
    }
    if ((entry.tests?.commands ?? []).length > 0) {
      caps.push(`tests:${entry.id}`)
    }
    if (entry.kind === 'research') {
      caps.push(`research:${entry.id}`)
    }
    const seenCap = new Set()
    for (const cap of caps) {
      if (!cap || seenCap.has(cap)) continue
      seenCap.add(cap)
      const capNode = `capability:${cap}`
      if (!nodes.some((n) => n.id === capNode)) {
        nodes.push({
          id: capNode,
          type: 'capability',
          label: cap,
          venture_id: entry.id,
        })
      }
      edges.push({
        id: `e-venture:${entry.id}-${capNode}`,
        from: `venture:${entry.id}`,
        to: capNode,
        rel: 'capability',
      })
    }
  }

  const agentsWithSkills = (skillGraph?.agents ?? []).filter(
    (a) => (a.skills ?? []).length > 0,
  ).length
  const agentsWithoutSkills = (skillGraph?.agents ?? []).filter(
    (a) => !(a.skills ?? []).length,
  ).map((a) => a.id)

  const active = surfaceVentures.filter((v) => v.status === 'active')
  const p0 = active.filter((v) => v.priority === 'P0')
  const withDash = surfaceVentures.filter((v) => v.dashboardPort != null)

  const kingdomRoot = path.join(dataDir, '..', '..')
  const ventureTemplate = loadVentureTemplate(kingdomRoot)
  const capabilityCount = nodes.filter((n) => n.type === 'capability').length

  const surface = {
    synced_at: syncedAt,
    version: 2,
    contract: 'kingdom-personal-os',
    fsm: {
      state: 'ready',
      last_transition: 'sync_complete',
      allowed: [
        'sync',
        'start_service',
        'stop_service',
        'start_all',
        'stop_all',
        'open_venture',
        'open_graph',
        'open_research',
        'run_tests',
      ],
    },
    summary: {
      ventures_total: surfaceVentures.length,
      ventures_active: active.length,
      ventures_p0: p0.length,
      dashboards_configured: withDash.length,
      skills: skillIds.length,
      agents: skillGraph?.agents?.length ?? 0,
      agents_with_skills: agentsWithSkills,
      agents_without_skills: agentsWithoutSkills,
      capabilities: capabilityCount,
      phases_board_synced_at: phasesBoard?.synced_at ?? null,
    },
    ventures: surfaceVentures,
    skills: skillIds,
    graph: { nodes, edges },
    onboarding: {
      template: 'config/venture-template.json',
      wiki: 'brain/wiki/concepts/onboard-new-project.md',
      architecture: 'brain/wiki/concepts/kingdom-personal-os.md',
      has_template: Boolean(ventureTemplate),
      after_register: ventureTemplate?.orchestrator_contract?.after_register ?? [],
    },
    open: {
      throne: '/?tab=throne',
      graph: '/?tab=graph',
      research: '/?tab=research',
      ventures: '/?tab=ventures',
      harness: 'brain/harness/empty-model/',
    },
  }

  writeJson(path.join(dataDir, 'control-surface.json'), surface)

  // Keep harness empty-model graph in lockstep with sync (deterministic KG seed).
  const harnessDir = path.join(dataDir, '..', '..', 'brain', 'harness', 'empty-model')
  if (fs.existsSync(path.dirname(harnessDir))) {
    fs.mkdirSync(harnessDir, { recursive: true })
    writeJson(path.join(harnessDir, 'graph.json'), {
      synced_at: syncedAt,
      note: 'Auto-refreshed by npm run sync — edit schema in brain/harness, not this file by hand.',
      nodes,
      edges,
    })
    writeJson(path.join(harnessDir, 'fsm.json'), {
      synced_at: syncedAt,
      machine: 'kingdom-control',
      state: surface.fsm.state,
      last_transition: surface.fsm.last_transition,
      transitions: [
        { from: 'idle', event: 'sync_start', to: 'syncing' },
        { from: 'syncing', event: 'sync_complete', to: 'ready' },
        { from: 'syncing', event: 'sync_fail', to: 'degraded' },
        { from: 'ready', event: 'sync_start', to: 'syncing' },
        { from: 'ready', event: 'start_all', to: 'orchestrating' },
        { from: 'orchestrating', event: 'idle', to: 'ready' },
        { from: 'degraded', event: 'sync_start', to: 'syncing' },
      ],
      allowed_in_state: {
        idle: ['sync'],
        syncing: [],
        ready: surface.fsm.allowed,
        orchestrating: ['stop_all', 'open_venture'],
        degraded: ['sync'],
      },
    })
  }

  console.log(
    'Wrote control-surface.json ·',
    active.length,
    'active ·',
    skillIds.length,
    'skills · FSM',
    surface.fsm.state,
  )
  return surface
}
