export type TalkNode = { id: string; label: string }
export type TalkEdge = { from: string; to: string; label?: string }
export type TalkGraph = { nodes: TalkNode[]; edges: TalkEdge[] }

const SKIP = new Set([
  'flowchart',
  'graph',
  'subgraph',
  'end',
  'style',
  'classDef',
  'class',
  'click',
  'direction',
  'LR',
  'RL',
  'TD',
  'TB',
  'BT',
])

/** Pull the first mermaid fence out of markdown/wiki content. */
export function extractMermaid(markdown: string | null | undefined): string | null {
  if (!markdown) return null
  const m = markdown.match(/```mermaid\s*\n([\s\S]*?)```/)
  return m?.[1]?.trim() || null
}

/**
 * Parse flowchart mermaid, including `ID["label"] -->|edge| ID2["label"]`.
 * The naive `ID --> ID` regex misses quoted node labels on the same line.
 */
export function parseMermaidFlow(source: string): TalkGraph {
  const nodes = new Map<string, string>()
  const edges: TalkEdge[] = []

  const nodeRe = /([A-Za-z][\w]*)\s*\[\s*"?([^\]"]+)"?\s*\]/g
  let m: RegExpExecArray | null
  while ((m = nodeRe.exec(source))) {
    if (SKIP.has(m[1])) continue
    nodes.set(m[1], m[2].trim())
  }

  const edgeRe =
    /([A-Za-z][\w]*)(?:\s*\[[^\]]*\])?\s*-->\s*(?:\|([^|]+)\|\s*)?([A-Za-z][\w]*)/g
  while ((m = edgeRe.exec(source))) {
    const from = m[1]
    const to = m[3]
    if (SKIP.has(from) || SKIP.has(to)) continue
    if (!nodes.has(from)) nodes.set(from, from)
    if (!nodes.has(to)) nodes.set(to, to)
    const label = m[2]?.trim()
    if (!edges.some((e) => e.from === from && e.to === to && e.label === label)) {
      edges.push({ from, to, label: label || undefined })
    }
  }

  return {
    nodes: [...nodes.entries()].map(([id, label]) => ({ id, label })),
    edges,
  }
}

export function layoutTalkGraph(graph: TalkGraph): TalkGraph & {
  positions: Record<string, { x: number; y: number }>
} {
  const indeg = new Map<string, number>()
  for (const n of graph.nodes) indeg.set(n.id, 0)
  for (const e of graph.edges) indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1)

  const rank = new Map<string, number>()
  const queue = graph.nodes.filter((n) => (indeg.get(n.id) ?? 0) === 0).map((n) => n.id)
  if (!queue.length && graph.nodes[0]) queue.push(graph.nodes[0].id)
  for (const id of queue) rank.set(id, 0)

  const outgoing = new Map<string, string[]>()
  for (const e of graph.edges) {
    outgoing.set(e.from, [...(outgoing.get(e.from) ?? []), e.to])
  }

  const seen = new Set(queue)
  while (queue.length) {
    const id = queue.shift()!
    const r = rank.get(id) ?? 0
    for (const next of outgoing.get(id) ?? []) {
      rank.set(next, Math.max(rank.get(next) ?? 0, r + 1))
      if (!seen.has(next)) {
        seen.add(next)
        queue.push(next)
      }
    }
  }

  const cols = new Map<number, string[]>()
  for (const n of graph.nodes) {
    const r = rank.get(n.id) ?? 0
    cols.set(r, [...(cols.get(r) ?? []), n.id])
  }

  const COL_W = 210
  const ROW_H = 88
  const positions: Record<string, { x: number; y: number }> = {}
  for (const [r, ids] of cols) {
    ids.forEach((id, i) => {
      positions[id] = { x: 24 + r * COL_W, y: 24 + i * ROW_H }
    })
  }

  return { ...graph, positions }
}

export function fallbackTalkGraph(input: {
  name: string
  field?: string
  experiments?: { summary: string; source?: string }[]
  videos?: string[]
}): TalkGraph {
  const nodes: TalkNode[] = [
    { id: 'repo', label: input.name },
    { id: 'field', label: input.field || 'research' },
    { id: 'lab', label: 'Research Lab' },
  ]
  const edges: TalkEdge[] = [
    { from: 'field', to: 'repo', label: 'scope' },
    { from: 'repo', to: 'lab', label: 'sync' },
  ]
  ;(input.experiments ?? []).slice(0, 6).forEach((exp, i) => {
    const id = `exp${i}`
    nodes.push({ id, label: exp.summary.slice(0, 48) })
    edges.push({ from: 'repo', to: id, label: exp.source || 'exp' })
  })
  if (input.videos?.length) {
    nodes.push({ id: 'proofs', label: `proofs (${input.videos.length} mp4)` })
    edges.push({ from: 'repo', to: 'proofs', label: 'video' })
    edges.push({ from: 'proofs', to: 'lab' })
  }
  return { nodes, edges }
}
