import { useEffect, useMemo, useState } from 'react'
import './ResearchLab.css'

type ResearchLabProps = {
  onOpenVenture?: (id: string, tab?: string) => void
  onOpenGraph?: (nodeId: string) => void
  onOpenExpenses?: () => void
}

/** Matches public/data/research-lab.json from npm run sync. */
type LabExperiment = {
  date: string
  summary: string
  source?: string
  video?: string | null
}

type LabDiagram = {
  source?: string
  svg_inline?: string | null
}

type LabProject = {
  id: string
  name: string
  field: string
  progress: number
  version: string | null
  nextMilestone: string | null
  spendUsd: number
  videos: string[]
  experiments: LabExperiment[]
  architecture?: {
    sections?: Record<string, { diagrams?: LabDiagram[] }>
  } | null
}

type LabPayload = {
  updated: string
  projects: LabProject[]
}

type FlowNode = { id: string; label: string }
type FlowEdge = { from: string; to: string; label?: string }

function parseMermaidFlow(source: string): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const nodes = new Map<string, string>()
  const edges: FlowEdge[] = []
  const nodeRe = /([A-Za-z][\w]*)\s*\[\s*"([^"]+)"\s*\]/g
  let m: RegExpExecArray | null
  while ((m = nodeRe.exec(source))) {
    nodes.set(m[1], m[2])
  }
  const labeled = /([A-Za-z][\w]*)\s*-->\|([^|]*)\|\s*([A-Za-z][\w]*)/g
  while ((m = labeled.exec(source))) {
    edges.push({ from: m[1], to: m[3], label: m[2].trim() })
    if (!nodes.has(m[1])) nodes.set(m[1], m[1])
    if (!nodes.has(m[3])) nodes.set(m[3], m[3])
  }
  const plain = /([A-Za-z][\w]*)\s*-->\s*([A-Za-z][\w]*)/g
  while ((m = plain.exec(source))) {
    if (edges.some((e) => e.from === m![1] && e.to === m![2])) continue
    edges.push({ from: m[1], to: m[2] })
    if (!nodes.has(m[1])) nodes.set(m[1], m[1])
    if (!nodes.has(m[2])) nodes.set(m[2], m[2])
  }
  return {
    nodes: [...nodes.entries()].map(([id, label]) => ({ id, label })),
    edges,
  }
}

function firstDiagram(project: LabProject): LabDiagram | null {
  for (const section of Object.values(project.architecture?.sections ?? {})) {
    for (const d of section.diagrams ?? []) {
      if (d.svg_inline || d.source) return d
    }
  }
  return null
}

function FileTalkGraph({ source }: { source: string }) {
  const { nodes, edges } = useMemo(() => parseMermaidFlow(source), [source])
  if (!nodes.length) return null
  return (
    <div className="file-talk" role="figure" aria-label="How files talk to each other">
      <p className="eyebrow">How files talk</p>
      <div className="file-talk-nodes">
        {nodes.map((n) => (
          <div key={n.id} className="file-talk-node" title={n.id}>
            <span className="file-talk-id">{n.id}</span>
            <strong>{n.label}</strong>
          </div>
        ))}
      </div>
      {edges.length ? (
        <ul className="file-talk-edges">
          {edges.map((e) => (
            <li key={`${e.from}-${e.to}-${e.label ?? ''}`}>
              <code>{e.from}</code>
              <span className="file-talk-arrow">{e.label ? `— ${e.label} →` : '→'}</span>
              <code>{e.to}</code>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export function ResearchLab({ onOpenVenture, onOpenGraph, onOpenExpenses }: ResearchLabProps) {
  const [data, setData] = useState<LabPayload | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void fetch(`/data/research-lab.json?_=${Date.now()}`, { cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error(`research-lab.json ${r.status}`)
        return r.json() as Promise<LabPayload>
      })
      .then((j) => {
        if (!cancelled) setData(j)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load research lab')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const projects = data?.projects ?? []

  return (
    <section className="panel research-lab">
      <header className="panel-head">
        <div>
          <h2>Research Lab</h2>
          <p className="muted">
            GPU and paper projects live here, not on the cash-venture board. Register a repo with{' '}
            <code>kind: research</code> and run <code>npm run sync</code>.
          </p>
        </div>
        {data?.updated ? (
          <span className="muted tiny">synced {new Date(data.updated).toLocaleString()}</span>
        ) : null}
      </header>

      <p className="research-insurance">
        Model weights are never git. After any train, tell Avinash the NFS/local checkpoint path so he
        can copy them as insurance.
      </p>

      {error ? (
        <p className="muted">
          {error}. Run <code>npm run sync</code>.
        </p>
      ) : null}
      {!error && !projects.length ? (
        <p className="muted">No research projects yet.</p>
      ) : null}

      <div className="research-grid">
        {projects.map((p) => {
          const diagram = firstDiagram(p)
          const experiments = p.experiments ?? []
          return (
            <article key={p.id} className="research-card">
              <header className="research-card-head">
                <div>
                  <p className="eyebrow">{p.field}</p>
                  <h3>{p.name}</h3>
                </div>
                <span className="stat-v">{p.progress}%</span>
              </header>
              <p className="muted tiny">
                {p.version ?? '—'} · spend ${Number(p.spendUsd ?? 0).toFixed(2)}
              </p>
              {p.nextMilestone ? <p>{p.nextMilestone}</p> : null}

              {diagram?.svg_inline ? (
                <div
                  className="mermaid-svg arch-mermaid research-flow"
                  dangerouslySetInnerHTML={{ __html: diagram.svg_inline }}
                />
              ) : diagram?.source ? (
                <FileTalkGraph source={diagram.source} />
              ) : null}

              {experiments.length ? (
                <ul className="exp-list">
                  {experiments.slice(0, 8).map((e) => (
                    <li key={`${e.date}-${e.summary}`}>
                      <span className="badge ghost">{e.date}</span>{' '}
                      {e.source ? <span className="badge ghost tiny">{e.source}</span> : null}{' '}
                      {e.summary}
                      {e.video ? (
                        <video
                          className="research-video"
                          src={e.video}
                          controls
                          playsInline
                          preload="metadata"
                        />
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted tiny">No experiments logged yet.</p>
              )}

              <div className="research-actions">
                {onOpenVenture ? (
                  <button
                    type="button"
                    className="btn primary"
                    onClick={() => onOpenVenture(p.id, 'experiments')}
                  >
                    Open venture
                  </button>
                ) : null}
                {onOpenGraph ? (
                  <button type="button" className="btn" onClick={() => onOpenGraph(`venture:${p.id}`)}>
                    Fleet graph
                  </button>
                ) : null}
                {onOpenExpenses ? (
                  <button type="button" className="btn ghost" onClick={() => onOpenExpenses()}>
                    Expenses
                  </button>
                ) : null}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
