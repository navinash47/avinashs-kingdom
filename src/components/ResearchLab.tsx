import { useEffect, useMemo, useState } from 'react'
import './ResearchLab.css'
import { ResearchFlowGraph } from './ResearchFlowGraph'
import { extractMermaid } from '../lib/researchGraph'
import type { InspectorTab } from '../types'

type ResearchLabProps = {
  onOpenVenture?: (id: string, tab?: InspectorTab) => void
  onOpenGraph?: (nodeId: string) => void
  onOpenExpenses?: () => void
}

type LabExperiment = {
  date: string
  summary: string
  source?: string
  video?: string | null
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
  mermaid: string | null
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : v == null ? '' : String(v)
}

function num(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function pick<T = unknown>(row: Record<string, unknown>, ...keys: string[]): T | undefined {
  for (const k of keys) {
    if (row[k] !== undefined) return row[k] as T
  }
  return undefined
}

function mermaidFromArchitecture(arch: unknown): string | null {
  if (!isRecord(arch)) return null
  const sections = pick<Record<string, unknown>>(arch, 'sections', 'sections')
  if (!isRecord(sections)) {
    return extractMermaid(str(pick(arch, 'content', 'markdown')))
  }
  for (const section of Object.values(sections)) {
    if (!isRecord(section)) continue
    const diagrams = pick<unknown[]>(section, 'diagrams', 'diagrams') ?? []
    for (const d of diagrams) {
      if (!isRecord(d)) continue
      const source = str(pick(d, 'source', 'source'))
      if (source.includes('-->') || source.includes('flowchart') || source.includes('graph ')) {
        return source
      }
    }
    const blob = [str(pick(section, 'content', 'content')), str(pick(section, 'markdown', 'markdown'))]
      .filter(Boolean)
      .join('\n')
    const fenced = extractMermaid(blob)
    if (fenced) return fenced
  }
  return null
}

function normalizeExperiment(raw: unknown): LabExperiment | null {
  if (!isRecord(raw)) return null
  const summary = str(pick(raw, 'summary', 'summary', 'title'))
  if (!summary) return null
  return {
    date: str(pick(raw, 'date', 'date')) || '—',
    summary,
    source: str(pick(raw, 'source', 'source')) || undefined,
    video: (pick(raw, 'video', 'video') as string | null | undefined) ?? null,
  }
}

function normalizeProject(raw: unknown): LabProject | null {
  if (!isRecord(raw)) return null
  const id = str(pick(raw, 'id', 'id'))
  if (!id) return null
  const experimentsRaw = pick<unknown[]>(raw, 'experiments', 'experiments') ?? []
  const videosRaw = pick<unknown[]>(raw, 'videos', 'videos') ?? []
  return {
    id,
    name: str(pick(raw, 'name', 'name')) || id,
    field: str(pick(raw, 'field', 'field')) || 'research',
    progress: num(pick(raw, 'progress', 'progress')),
    version: (pick(raw, 'version', 'version') as string | null | undefined) ?? null,
    nextMilestone:
      (pick(raw, 'nextMilestone', 'next_milestone') as string | null | undefined) ?? null,
    spendUsd: num(pick(raw, 'spendUsd', 'spend_usd')),
    videos: videosRaw.map((v) => str(v)).filter(Boolean),
    experiments: experimentsRaw.map(normalizeExperiment).filter((e): e is LabExperiment => !!e),
    mermaid: mermaidFromArchitecture(pick(raw, 'architecture', 'architecture')),
  }
}

function normalizePayload(raw: unknown): LabProject[] {
  if (!isRecord(raw)) return []
  const list = pick<unknown[]>(raw, 'projects', 'projects') ?? []
  return list.map(normalizeProject).filter((p): p is LabProject => !!p)
}

export function ResearchLab({ onOpenVenture, onOpenGraph, onOpenExpenses }: ResearchLabProps) {
  const [projects, setProjects] = useState<LabProject[]>([])
  const [updated, setUpdated] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void fetch(`/data/research-lab.json?_=${Date.now()}`, { cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error(`research-lab.json ${r.status}`)
        return r.json() as Promise<unknown>
      })
      .then((j) => {
        if (cancelled) return
        const list = normalizePayload(j)
        setProjects(list)
        setUpdated(
          isRecord(j) ? str(pick(j, 'updated', 'updated')) || null : null,
        )
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load research lab')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const count = useMemo(() => projects.length, [projects])

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
        {updated ? (
          <span className="muted tiny">synced {new Date(updated).toLocaleString()}</span>
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
      {!error && !count ? <p className="muted">No research projects yet.</p> : null}

      <div className="research-grid">
        {projects.map((p) => (
          <article key={p.id} className="research-card">
            <header className="research-card-head">
              <div>
                <p className="eyebrow">{p.field}</p>
                <h3>{p.name}</h3>
              </div>
              <span className="stat-v">{p.progress}%</span>
            </header>
            <p className="muted tiny">
              {p.version ?? '—'} · spend ${p.spendUsd.toFixed(2)}
            </p>
            {p.nextMilestone ? <p>{p.nextMilestone}</p> : null}

            <ResearchFlowGraph
              mermaid={p.mermaid}
              name={p.name}
              field={p.field}
              experiments={p.experiments}
              videos={p.videos}
            />

            {p.experiments.length ? (
              <ul className="exp-list">
                {p.experiments.slice(0, 8).map((e) => (
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
                <button
                  type="button"
                  className="btn"
                  onClick={() => onOpenGraph(`venture:${p.id}`)}
                >
                  Kingdom graph
                </button>
              ) : null}
              {onOpenExpenses ? (
                <button type="button" className="btn ghost" onClick={() => onOpenExpenses()}>
                  Expenses
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
