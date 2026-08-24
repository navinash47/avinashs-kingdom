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

type LabTraining = {
  updated?: string | null
  status?: 'idle' | 'running' | 'unknown' | string
  host?: string | null
  robot?: string | null
  stage?: number | string | null
  num_envs?: number | null
  max_iterations?: number | null
  iteration?: number | null
  logger?: string | null
  wandb_project?: string | null
  wandb_entity?: string | null
  wandb_url?: string | null
  log_dir?: string | null
  checkpoint?: string | null
  note?: string | null
  source?: string | null
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
  training?: LabTraining | null
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

function wandbLink(training: LabTraining | null | undefined, projectId: string) {
  const project = training?.wandb_project || (projectId === 'beamdojo' ? 'beamdojo' : projectId)
  const entity = training?.wandb_entity?.trim() || ''
  const explicit = training?.wandb_url?.trim() || ''
  if (explicit && explicit !== 'https://wandb.ai' && explicit !== 'https://wandb.ai/') {
    const hasProjectPath = /wandb\.ai\/[^/]+\/[^/]+/.test(explicit)
    return { href: explicit, project, needsProjectHint: !entity && !hasProjectPath }
  }
  if (entity) {
    return { href: `https://wandb.ai/${entity}/${project}`, project, needsProjectHint: false }
  }
  return { href: 'https://wandb.ai', project, needsProjectHint: true }
}

function statusLabel(status: string) {
  if (status === 'running') return 'Running'
  if (status === 'idle') return 'Idle'
  return 'Unknown'
}

/** Keep in sync with showLiveTrainingCard in scripts/lib/research-lab.mjs. */
function showLiveTraining(project: LabProject) {
  return project.id === 'beamdojo' || project.training != null
}

function LiveTrainingPanel({ project }: { project: LabProject }) {
  const training = project.training ?? null
  const statusRaw = training?.status
  const status =
    statusRaw === 'running' || statusRaw === 'idle' || statusRaw === 'unknown'
      ? statusRaw
      : 'unknown'
  const gpuProject = project.id === 'beamdojo'
  const link = wandbLink(training, project.id)
  const meta: { label: string; value: string }[] = []
  if (training?.host) meta.push({ label: 'Host', value: String(training.host) })
  if (training?.robot) meta.push({ label: 'Robot', value: String(training.robot) })
  if (training?.stage != null) meta.push({ label: 'Stage', value: String(training.stage) })
  if (training?.num_envs != null) meta.push({ label: 'Envs', value: String(training.num_envs) })
  if (training?.iteration != null || training?.max_iterations != null) {
    const cur = training?.iteration != null ? String(training.iteration) : '—'
    const max = training?.max_iterations != null ? String(training.max_iterations) : '—'
    meta.push({ label: 'Iteration', value: `${cur} / ${max}` })
  }
  if (training?.logger) meta.push({ label: 'Logger', value: String(training.logger) })

  const idleCopy =
    status === 'idle'
      ? 'Idle — no long train is running from the last status snapshot.'
      : status === 'running'
        ? 'A train is marked running in the last synced JSON. Open Weights & Biases for live curves.'
        : 'Unknown — no live status file on last sync (or it could not be read). Not claiming a train is running.'

  const exampleHint =
    training?.source === 'example'
      ? ' Showing the checked-in idle example; the live file is gitignored and was not present.'
      : ''

  return (
    <div className="live-train">
      <div className="live-train-head">
        <p className="eyebrow">Live training</p>
        <span className={`badge ${status}`}>{statusLabel(status)}</span>
      </div>
      <p className="muted tiny">
        {idleCopy}
        {exampleHint}
      </p>
      {training?.updated ? (
        <p className="muted tiny">Status written {new Date(training.updated).toLocaleString()}</p>
      ) : null}
      {meta.length ? (
        <dl className="live-train-meta">
          {meta.map((row) => (
            <div key={row.label}>
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      <a
        className="btn primary live-train-wandb"
        href={link.href}
        target="_blank"
        rel="noreferrer"
      >
        Open Weights &amp; Biases
      </a>
      <p className="live-train-how">
        Lambda has no public Isaac webpage. Weights &amp; Biases is the browser UI for live
        metrics.
        {link.needsProjectHint ? (
          <>
            {' '}
            After <code>wandb login</code> on the GPU box, open project{' '}
            <strong>{link.project}</strong> (this link is the W&amp;B home page until an entity is
            set).
          </>
        ) : (
          <> This link opens the W&amp;B project.</>
        )}
      </p>
      {gpuProject ? (
        <>
          <p className="live-train-how">
            TensorBoard is SSH-only (not a public URL). From your Mac:
          </p>
          <pre className="mono-path">ssh -L 6006:localhost:6006 lambda-beamdojo</pre>
          <p className="live-train-how">
            Then run TensorBoard on <code>/lambda/nfs/beamdojo/logs</code> and open{' '}
            <code>http://localhost:6006</code>.
          </p>
        </>
      ) : null}
      {training?.log_dir ? (
        <p className="mono-path" title="NFS / log dir">
          log_dir: {training.log_dir}
        </p>
      ) : gpuProject ? (
        <p className="mono-path">NFS logs (default): /lambda/nfs/beamdojo/logs</p>
      ) : null}
      {training?.checkpoint ? (
        <p className="mono-path" title="Checkpoint (never git)">
          checkpoint: {training.checkpoint}
        </p>
      ) : (
        <p className="muted tiny">No checkpoint path recorded. Model weights are never git.</p>
      )}
      {training?.note ? <p className="muted tiny">{training.note}</p> : null}
    </div>
  )
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

              {showLiveTraining(p) ? <LiveTrainingPanel project={p} /> : null}

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
