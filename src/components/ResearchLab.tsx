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
  mermaid: string | null
  training?: LabTraining | null
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

function maybeNum(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
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
        metrics. This card re-reads status every 5s from the BeamDojo checkout (dev) or last
        sync.
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

function normalizeTraining(raw: unknown): LabTraining | null {
  if (!isRecord(raw)) return null
  const statusRaw = str(pick(raw, 'status'))
  const status =
    statusRaw === 'running' || statusRaw === 'idle' || statusRaw === 'unknown'
      ? statusRaw
      : statusRaw
        ? 'unknown'
        : undefined
  return {
    updated: str(pick(raw, 'updated')) || null,
    status,
    host: str(pick(raw, 'host')) || null,
    robot: str(pick(raw, 'robot')) || null,
    stage: (pick(raw, 'stage') as LabTraining['stage']) ?? null,
    num_envs: maybeNum(pick(raw, 'num_envs')),
    max_iterations: maybeNum(pick(raw, 'max_iterations')),
    iteration: maybeNum(pick(raw, 'iteration')),
    logger: str(pick(raw, 'logger')) || null,
    wandb_project: str(pick(raw, 'wandb_project')) || null,
    wandb_entity: str(pick(raw, 'wandb_entity')) || null,
    wandb_url: str(pick(raw, 'wandb_url')) || null,
    log_dir: str(pick(raw, 'log_dir')) || null,
    checkpoint: str(pick(raw, 'checkpoint')) || null,
    note: str(pick(raw, 'note')) || null,
    source: str(pick(raw, 'source')) || null,
  }
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
    training: normalizeTraining(pick(raw, 'training', 'training')),
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
    const load = () => {
      void Promise.all([
        fetch(`/data/research-lab.json?_=${Date.now()}`, { cache: 'no-store' }).then((r) => {
          if (!r.ok) throw new Error(`research-lab.json ${r.status}`)
          return r.json() as Promise<unknown>
        }),
        fetch(`/live/training-status.json?_=${Date.now()}`, { cache: 'no-store' })
          .then((r) => (r.ok ? (r.json() as Promise<LabTraining>) : null))
          .catch(() => null),
        fetch(`/data/research/beamdojo/training-status.json?_=${Date.now()}`, { cache: 'no-store' })
          .then((r) => (r.ok ? (r.json() as Promise<LabTraining>) : null))
          .catch(() => null),
      ])
        .then(([j, live, synced]) => {
          if (cancelled) return
          const list = normalizePayload(j)
          const overlay = live?.status ? live : synced?.status ? synced : null
          setProjects(
            overlay
              ? list.map((p) =>
                  p.id === 'beamdojo'
                    ? {
                        ...p,
                        training: {
                          ...p.training,
                          ...overlay,
                          source: live?.status ? (live.source ?? 'live') : overlay.source,
                        },
                      }
                    : p,
                )
              : list,
          )
          setUpdated(isRecord(j) ? str(pick(j, 'updated', 'updated')) || null : null)
          setError(null)
        })
        .catch((e) => {
          if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load research lab')
        })
    }
    load()
    const id = window.setInterval(load, 5000)
    return () => {
      cancelled = true
      window.clearInterval(id)
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
          <span className="muted tiny">
            synced {new Date(updated).toLocaleString()} · live poll 5s
          </span>
        ) : (
          <span className="muted tiny">live poll 5s</span>
        )}
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

            {showLiveTraining(p) ? <LiveTrainingPanel project={p} /> : null}

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
