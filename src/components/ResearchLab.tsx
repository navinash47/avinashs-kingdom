import { useEffect, useState } from 'react'

type ResearchLabProps = {
  onOpenVenture?: (id: string, tab?: string) => void
  onOpenGraph?: (nodeId: string) => void
  onOpenExpenses?: () => void
}

type ResearchExperiment = {
  date: string
  summary: string
  source?: string
  video?: string | null
}

type ResearchProject = {
  id: string
  name: string
  field: string
  progress: number
  version: string | null
  nextMilestone: string | null
  spendUsd: number
  videos: string[]
  experiments: ResearchExperiment[]
  architecture: {
    sections?: Record<
      string,
      { diagrams?: { svg_inline?: string | null; source?: string }[] }
    >
  } | null
}

type ResearchLabData = {
  updated: string
  projects: ResearchProject[]
}

function mermaidNodeLabels(source: string): string[] {
  const labels: string[] = []
  const re = /\[["']([^"'\]]+)["']\]/g
  let m: RegExpExecArray | null
  while ((m = re.exec(source))) {
    labels.push(m[1])
  }
  return labels
}

function firstFlow(project: ResearchProject): { svg: string | null; nodes: string[] } {
  const sections = project.architecture?.sections ?? {}
  for (const section of Object.values(sections)) {
    for (const d of section.diagrams ?? []) {
      if (d.svg_inline) return { svg: d.svg_inline, nodes: [] }
      if (d.source) return { svg: null, nodes: mermaidNodeLabels(d.source) }
    }
  }
  return { svg: null, nodes: [] }
}

export function ResearchLab({ onOpenVenture, onOpenGraph, onOpenExpenses }: ResearchLabProps) {
  const [data, setData] = useState<ResearchLabData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void fetch(`/data/research-lab.json?_=${Date.now()}`, { cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error(`research-lab.json ${r.status}`)
        return r.json() as Promise<ResearchLabData>
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
            GPU and paper projects live here, separate from cash ventures. Add a repo with{' '}
            <code>kind: research</code> in the venture registry and re-sync.
          </p>
        </div>
        {data?.updated ? (
          <span className="muted tiny">synced {new Date(data.updated).toLocaleString()}</span>
        ) : null}
      </header>

      <p className="research-insurance">
        Model weights are not in git. After any train, copy checkpoints off the GPU box as
        insurance — tell Avinash the NFS path.
      </p>

      {error ? <p className="muted">{error}. Run <code>npm run sync</code>.</p> : null}
      {!error && !projects.length ? (
        <p className="muted">No research projects yet. Register one with kind: research.</p>
      ) : null}

      <div className="research-grid">
        {projects.map((p) => {
          const { svg, nodes } = firstFlow(p)
          const videos = p.experiments.map((e) => e.video).filter(Boolean) as string[]
          const uniqueVideos = [...new Set(videos.length ? videos : p.videos.map((n) => `/data/research/${p.id}/${n}`))]
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
                {p.version ?? '—'} · spend ${p.spendUsd.toFixed(2)}
              </p>
              {p.nextMilestone ? <p>{p.nextMilestone}</p> : null}

              {svg ? (
                <div
                  className="mermaid-svg arch-mermaid research-flow"
                  dangerouslySetInnerHTML={{ __html: svg }}
                />
              ) : nodes.length ? (
                <div className="arch-flow research-flow" role="list">
                  {nodes.map((label, i) => (
                    <div key={`${label}-${i}`} className="arch-flow-item" role="listitem">
                      {i > 0 ? (
                        <span className="arch-chev" aria-hidden="true">
                          →
                        </span>
                      ) : null}
                      <div className={`arch-node ${i === 0 ? 'in' : i === nodes.length - 1 ? 'out' : ''}`}>
                        <strong>{label}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {uniqueVideos.length ? (
                <div className="research-videos">
                  {uniqueVideos.map((src) => (
                    <figure key={src}>
                      <video className="research-video" src={src} controls playsInline preload="metadata" />
                      <figcaption className="muted tiny">{src.split('/').pop()}</figcaption>
                    </figure>
                  ))}
                </div>
              ) : (
                <p className="muted tiny">No proof video yet.</p>
              )}

              {p.experiments.length ? (
                <ul className="exp-list">
                  {p.experiments.slice(0, 6).map((e) => (
                    <li key={`${e.date}-${e.summary}`}>
                      <span className="badge ghost">{e.date}</span>{' '}
                      {e.source ? <span className="badge ghost tiny">{e.source}</span> : null}{' '}
                      {e.summary}
                    </li>
                  ))}
                </ul>
              ) : null}

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
