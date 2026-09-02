import { useMemo, useState } from 'react'
import type {
  Agent,
  ArchitectureBundle,
  CicdSnapshot,
  ExperimentsBundle,
  InspectorTab,
  Venture,
  VentureManifest,
  VentureRegistryEntry,
} from '../types'
import { ProgressDial } from './ProgressDial'
import { SegmentedControl } from './SegmentedControl'
import { MarkdownBlock } from './MarkdownBlock'
import { useOrchestrator } from '../context/OrchestratorContext'
import { copyText, parseNextTasks } from '../lib/ventureUtils'

const TABS: { id: InspectorTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'actions', label: 'Actions' },
  { id: 'tech', label: 'Tech' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'data', label: 'Data' },
  { id: 'experiments', label: 'Experiments' },
  { id: 'models', label: 'Models' },
  { id: 'cicd', label: 'CI & Tests' },
]

type Props = {
  venture: Venture | null
  agent: Agent | null
  registryEntry: VentureRegistryEntry | null
  manifest: VentureManifest | null
  architecture: ArchitectureBundle | null
  experiments: ExperimentsBundle | null
  cicd: CicdSnapshot | null
  lastSyncAt: string | null
  globalSuggestions: string[]
}

export function VentureInspector({
  venture,
  agent,
  registryEntry,
  manifest,
  architecture,
  experiments,
  cicd,
  lastSyncAt,
  globalSuggestions,
}: Props) {
  const { inspectorTab, setInspectorTab, closeInspector, setPaletteOpen } =
    useOrchestrator()
  const [copied, setCopied] = useState<string | null>(null)

  const tasks = useMemo(
    () =>
      venture
        ? parseNextTasks(venture.notes, venture.nextMilestone)
        : [],
    [venture],
  )

  const suggestions = useMemo(() => {
    const s = [...(manifest?.suggestions ?? [])]
    for (const g of globalSuggestions) {
      if (venture && g.startsWith(venture.id)) s.push(g.replace(/^[^:]+:\s*/, ''))
    }
    return [...new Set(s)]
  }, [manifest, globalSuggestions, venture])

  const dataSection = useMemo(() => {
    if (!architecture?.sections) return null
    const entry = Object.entries(architecture.sections).find(([k]) =>
      k.includes('data store'),
    )
    return entry?.[1] ?? null
  }, [architecture])

  if (!venture) {
    return (
      <aside className="inspector inspector-empty" aria-label="Venture inspector">
        <div className="inspector-empty-body">
          <h3>Select a venture</h3>
          <p className="muted">
            Click a card on the left, or press{' '}
            <button type="button" className="link-btn" onClick={() => setPaletteOpen(true)}>
              ⌘K
            </button>{' '}
            to open the command palette.
          </p>
        </div>
      </aside>
    )
  }

  async function doCopy(label: string, text: string) {
    const ok = await copyText(text)
    if (ok) {
      setCopied(label)
      setTimeout(() => setCopied(null), 1500)
    }
  }

  return (
    <aside className="inspector" aria-label="Venture inspector">
      <header className="inspector-head">
        <div className="inspector-title-row">
          <ProgressDial value={venture.progress} size={56} />
          <div>
            <span className="badge">{venture.priority}</span>
            <h3>{venture.name}</h3>
            <p className="muted tiny">{venture.version}</p>
          </div>
        </div>
        <button type="button" className="btn ghost inspector-close" onClick={closeInspector}>
          Close
        </button>
      </header>

      <div className="inspector-tabs">
        <SegmentedControl
          value={inspectorTab}
          onChange={(v) => setInspectorTab(v as InspectorTab)}
          options={TABS}
        />
      </div>

      <div className="inspector-body">
        {inspectorTab === 'overview' && (
          <>
            {agent ? (
              <div className="inspector-block">
                <h4>Agent</h4>
                <p className="strong">{agent.name}</p>
                <p className="muted tiny">{agent.focus}</p>
                <p className="tiny">
                  Token budget ${agent.tokenBudgetUsd} · used ${agent.tokenUsedUsd}
                </p>
              </div>
            ) : null}
            {venture.phasesPassed != null && venture.phasesTotal != null ? (
              <div className="inspector-block">
                <h4>Phases</h4>
                <p>
                  {venture.phasesPassed}/{venture.phasesTotal} pass
                </p>
                {venture.spendUsd != null ? (
                  <p className="tiny">
                    Spend ${venture.spendUsd}
                    {venture.ceilingUsd != null ? ` / $${venture.ceilingUsd}` : ''}
                  </p>
                ) : null}
              </div>
            ) : null}
            {tasks.length ? (
              <div className="inspector-block">
                <h4>Next tasks</h4>
                <ol className="task-list">
                  {tasks.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ol>
              </div>
            ) : null}
            {venture.progressSource ? (
              <p className="muted tiny">{venture.progressSource}</p>
            ) : null}
            {suggestions.length ? (
              <div className="inspector-block suggestions">
                <h4>Suggestions</h4>
                <ul>
                  {suggestions.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <p className="muted tiny sync-hint">
              {lastSyncAt
                ? `Synced ${new Date(lastSyncAt).toLocaleString()}`
                : 'Run npm run sync to refresh'}
            </p>
          </>
        )}

        {inspectorTab === 'actions' && (
          <div className="inspector-actions">
            {venture.repoPath ? (
              <button
                type="button"
                className="btn"
                onClick={() => void doCopy('repo', venture.repoPath!)}
              >
                {copied === 'repo' ? 'Copied' : 'Copy repo path'}
              </button>
            ) : null}
            {registryEntry?.dashboard ? (
              <a
                className="btn primary"
                href={`http://127.0.0.1:${registryEntry.dashboard.port}`}
                target="_blank"
                rel="noreferrer"
              >
                Open dashboard
                {manifest?.services?.[0]?.status === 'up' ? (
                  <span className="badge ok">UP</span>
                ) : (
                  <span className="badge warn">DOWN</span>
                )}
              </a>
            ) : null}
            <button
              type="button"
              className="btn"
              onClick={() => void doCopy('sync', 'npm run sync')}
            >
              {copied === 'sync' ? 'Copied' : 'Copy npm run sync'}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => void doCopy('dash', 'npm run dashboards')}
            >
              {copied === 'dash' ? 'Copied' : 'Copy npm run dashboards'}
            </button>
            {registryEntry?.paths?.status && venture.repoPath ? (
              <p className="mono tiny path-line">
                {venture.repoPath}/{registryEntry.paths.status}
              </p>
            ) : null}
            {registryEntry?.wiki?.venture ? (
              <p className="muted tiny">Wiki: {registryEntry.wiki.venture}</p>
            ) : null}
          </div>
        )}

        {inspectorTab === 'tech' && (
          <>
            {!manifest?.stats ? (
              <p className="muted">Run npm run sync for tech census.</p>
            ) : (
              <>
                <div className="inspector-block">
                  <h4>Repo stats</h4>
                  <p>
                    {manifest.stats.lines.toLocaleString()} lines ·{' '}
                    {manifest.stats.files.toLocaleString()} files
                  </p>
                  <p className="tiny">
                    Primary: <strong>{manifest.stats.primary_language ?? '—'}</strong>
                    {manifest.stats.source ? (
                      <span className="muted"> · via {manifest.stats.source}</span>
                    ) : null}
                  </p>
                  {manifest.stats.truncated ? (
                    <p className="badge warn tiny">
                      Sampled {manifest.stats.sampled_files?.toLocaleString() ?? '?'} files — LOC approximate
                    </p>
                  ) : null}
                  {manifest.repo?.branch ? (
                    <p className="mono tiny">
                      {manifest.repo.branch} @ {manifest.repo.head?.slice(0, 8)}
                    </p>
                  ) : null}
                  {manifest.repo?.github ? (
                    <p className="mono tiny">
                      {manifest.repo.github.owner}/{manifest.repo.github.repo}
                    </p>
                  ) : null}
                </div>
                <div className="inspector-block">
                  <h4>Languages</h4>
                  {manifest.stats.languages.slice(0, 8).map((l) => (
                    <div key={l.language} className="lang-row">
                      <span>{l.language}</span>
                      <div className="alloc-bar">
                        <div
                          style={{
                            width: `${Math.min(100, (l.lines / manifest.stats!.lines) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="tiny muted">{l.lines.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                {manifest.dependencies?.runtime.length ? (
                  <div className="inspector-block">
                    <h4>Dependencies ({manifest.dependencies.ecosystem})</h4>
                    <ul className="dep-list">
                      {manifest.dependencies.runtime.slice(0, 12).map((d) => (
                        <li key={d.name}>
                          <code>{d.name}</code>
                          {d.version ? ` ${d.version}` : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </>
            )}
          </>
        )}

        {inspectorTab === 'architecture' && (
          <>
            {!architecture?.section_titles?.length ? (
              <p className="muted">
                Add brain/wiki/architecture/{venture.id}.md then sync.
              </p>
            ) : (
              architecture.section_titles.map((title) => {
                const key = title.toLowerCase()
                const sec = architecture.sections[key]
                if (!sec) return null
                return (
                  <div key={title} className="inspector-block md-block">
                    <h4>{title}</h4>
                    {sec.diagrams?.map((d, idx) =>
                      d.svg_inline ? (
                        <div
                          key={idx}
                          className="mermaid-svg"
                          dangerouslySetInnerHTML={{ __html: d.svg_inline }}
                        />
                      ) : d.svg_path ? (
                        <img key={idx} src={d.svg_path} alt="Architecture diagram" className="mermaid-img" />
                      ) : d.source ? (
                        <pre key={idx} className="md-pre mermaid-src">{d.source}</pre>
                      ) : null,
                    )}
                    {sec.markdown ? <MarkdownBlock text={sec.markdown} /> : null}
                  </div>
                )
              })
            )}
          </>
        )}

        {inspectorTab === 'data' && (
          <>
            {dataSection?.tables?.length ? (
              dataSection.tables.map((table, ti) => (
                <table key={ti} className="data-table">
                  <thead>
                    <tr>
                      {table.headers.map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {table.rows.map((row, ri) => (
                      <tr key={ri}>
                        {row.map((cell, ci) => (
                          <td key={ci} className={ci === 1 ? 'mono tiny' : 'tiny'}>
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ))
            ) : dataSection?.markdown ? (
              <MarkdownBlock text={dataSection.markdown} />
            ) : null}
            {manifest?.storage?.length ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Path</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {manifest.storage.map((s) => (
                    <tr key={`${s.type}-${s.path}`}>
                      <td>{s.type}</td>
                      <td className="mono tiny">{s.path}</td>
                      <td className="tiny muted">{s.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : !dataSection ? (
              <p className="muted tiny">No storage detected — sync or add architecture doc.</p>
            ) : null}
          </>
        )}

        {inspectorTab === 'experiments' && (
          <>
            {!experiments?.items?.length ? (
              <p className="muted">
                Log experiments in brain/wiki/experiments/{venture.id}.md
              </p>
            ) : (
              <ul className="exp-list">
                {experiments.items.map((e) => (
                  <li key={`${e.date}-${e.summary}`}>
                    <span className="badge ghost">{e.date}</span> {e.summary}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {inspectorTab === 'models' && (
          <>
            <div className="inspector-block">
              <h4>Spend</h4>
              <p>
                {manifest?.spend_usd != null
                  ? `$${manifest.spend_usd}`
                  : venture.spendUsd != null
                    ? `$${venture.spendUsd}`
                    : '—'}
                {manifest?.ceiling_usd ?? venture.ceilingUsd
                  ? ` / $${manifest?.ceiling_usd ?? venture.ceilingUsd} ceiling`
                  : ''}
              </p>
            </div>
            {manifest?.models_tested?.length ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Model</th>
                    <th>Calls</th>
                    <th>Spend</th>
                  </tr>
                </thead>
                <tbody>
                  {manifest.models_tested.map((m) => (
                    <tr key={m.name}>
                      <td><code>{m.name}</code></td>
                      <td>{m.calls}</td>
                      <td>${m.spend_usd.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
            {manifest?.models_detected?.length ? (
              <ul className="dep-list">
                {manifest.models_detected.map((m) => (
                  <li key={m.name}>
                    <code>{m.name}</code>
                    <span className="muted tiny"> · {m.source}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted tiny">No models in .env.example / README scan.</p>
            )}
          </>
        )}

        {inspectorTab === 'cicd' && (
          <>
            <div className="inspector-block">
              <h4>GitHub Actions</h4>
              {!cicd?.github ? (
                <p className="muted tiny">No GitHub repo detected — run sync.</p>
              ) : !cicd.github.available ? (
                <p className="muted tiny">Run gh auth login for CI status.</p>
              ) : cicd.github.runs.length === 0 ? (
                <p className="muted tiny">No recent workflow runs.</p>
              ) : (
                <ul className="ci-list">
                  {cicd.github.runs.map((r) => (
                    <li key={r.databaseId}>
                      <span
                        className={`badge ${r.conclusion === 'success' ? 'ok' : r.conclusion === 'failure' ? 'warn' : 'ghost'}`}
                      >
                        {r.conclusion ?? r.status}
                      </span>{' '}
                      <a href={r.url} target="_blank" rel="noreferrer">
                        {r.workflowName}
                      </a>
                      <span className="muted tiny"> · {r.displayTitle}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="inspector-block">
              <h4>Local tests</h4>
              {!cicd?.local_tests?.commands?.length ? (
                <p className="muted tiny">No test commands in registry.</p>
              ) : (
                <>
                  <ul className="dep-list">
                    {cicd.local_tests.commands.map((c) => (
                      <li key={c.id}>
                        <code>{c.cmd}</code>
                        <span className="badge ghost">{c.type}</span>
                      </li>
                    ))}
                  </ul>
                  {cicd.local_tests.last_run ? (
                    <p className="tiny">
                      Last run:{' '}
                      <strong>
                        {cicd.local_tests.last_run.ok ? 'PASS' : 'FAIL'}
                      </strong>{' '}
                      · {new Date(cicd.local_tests.last_run.ran_at).toLocaleString()}
                    </p>
                  ) : (
                    <p className="muted tiny">
                      Run: node scripts/run-venture-tests.mjs --venture {venture.id}
                    </p>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </aside>
  )
}
