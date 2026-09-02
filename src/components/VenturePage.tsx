import { useEffect, useMemo, useRef, useState } from 'react'
import type {
  Agent,
  ArchitectureBundle,
  CicdSnapshot,
  ExperimentsBundle,
  InspectorTab,
  Venture,
  VentureManifest,
  VentureRegistryEntry,
  WhatsAppPhases,
} from '../types'
import { ArchitectureBoard } from './ArchitectureBoard'
import { ProgressDial } from './ProgressDial'
import { SegmentedControl } from './SegmentedControl'
import { ServiceControlBar } from './ServiceControlBar'
import { DashboardEmbed } from './DashboardEmbed'
import { TestRunnerPanel } from './TestRunnerPanel'
import { WhatsAppPhasesPanel } from './WhatsAppPhasesPanel'
import { CityStageProofsPanel } from './CityStageProofsPanel'
import { OperationTerminal } from './OperationTerminal'
import { useOrchestrator } from '../context/OrchestratorContext'
import { operationLogKey, useOperationLog } from '../context/OperationLogContext'
import { useServiceStatus } from '../hooks/useServiceStatus'
import { useShareMode } from '../hooks/useShareMode'
import {
  restartService,
  serviceForVenture,
  startService,
  stopService,
  triggerSync,
  runVentureTests,
  fetchServiceLogs,
  formatTestOutput,
} from '../lib/orchestratorApi'
import { copyText, parseNextTasks } from '../lib/ventureUtils'

const TABS: { id: InspectorTab; label: string }[] = [
  { id: 'run', label: 'Run' },
  { id: 'overview', label: 'Overview' },
  { id: 'tech', label: 'Tech' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'data', label: 'Data' },
  { id: 'tests', label: 'Tests' },
  { id: 'experiments', label: 'Experiments' },
  { id: 'models', label: 'Models' },
  { id: 'cicd', label: 'CI' },
]

type Props = {
  venture: Venture
  agent: Agent | null
  registryEntry: VentureRegistryEntry | null
  manifest: VentureManifest | null
  architecture: ArchitectureBundle | null
  experiments: ExperimentsBundle | null
  cicd: CicdSnapshot | null
  whatsapp: WhatsAppPhases | null
  lastSyncAt: string | null
  globalSuggestions: string[]
  onRefresh?: () => void
}

export function VenturePage({
  venture,
  agent,
  registryEntry,
  manifest,
  architecture,
  experiments,
  cicd,
  whatsapp,
  lastSyncAt,
  globalSuggestions,
  onRefresh,
}: Props) {
  const { ventureTab, setVentureTab } = useOrchestrator()
  const shareMode = useShareMode()
  const { services, apiOk, refresh: refreshServices } = useServiceStatus()
  const [busy, setBusy] = useState(false)
  const [testRunning, setTestRunning] = useState(false)
  const [syncRunning, setSyncRunning] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const logKey = operationLogKey('venture', venture.id)
  const terminal = useOperationLog(logKey, `${venture.name} · terminal`)
  const testLogKey = operationLogKey('tests', venture.id)
  const testTerminal = useOperationLog(testLogKey, `Tests · ${venture.name}`)
  const outputRef = useRef(terminal.output)
  outputRef.current = terminal.output

  const service = useMemo(
    () => serviceForVenture(services, venture.id),
    [services, venture.id],
  )
  const selfHosted = venture.id === 'kingdom-ops'

  const tasks = useMemo(
    () => parseNextTasks(venture.notes, venture.nextMilestone),
    [venture],
  )

  const suggestions = useMemo(() => {
    const s = [...(manifest?.suggestions ?? [])]
    for (const g of globalSuggestions) {
      if (g.startsWith(venture.id)) s.push(g.replace(/^[^:]+:\s*/, ''))
    }
    return [...new Set(s)]
  }, [manifest, globalSuggestions, venture.id])

  const dataSection = useMemo(() => {
    if (!architecture?.sections) return null
    const entry = Object.entries(architecture.sections).find(([k]) =>
      k.includes('data store'),
    )
    return entry?.[1] ?? null
  }, [architecture])

  useEffect(() => {
    terminal.activate()
  }, [venture.id, terminal.activate])

  useEffect(() => {
    if (!terminal.pollLogs || !service?.name) return
    let cancelled = false
    const tick = async () => {
      try {
        const log = await fetchServiceLogs(service.name, 60)
        if (!cancelled && log) {
          const marker = '--- live service log ---'
          const base = outputRef.current.split(marker)[0].trimEnd()
          terminal.setOutput(`${base}\n\n${marker}\n${log}`)
        }
      } catch {
        /* ignore */
      }
    }
    void tick()
    const id = window.setInterval(() => void tick(), 2000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [terminal.pollLogs, service?.name, terminal.setOutput])

  async function doServiceAction(action: 'start' | 'stop' | 'restart') {
    if (!service) return
    setBusy(true)
    terminal.setTitle(`${action} · ${service.label}`)
    terminal.setStatus('running')
    terminal.setOutput(`> ${action} ${service.name} on :${service.port}…\n`)
    terminal.setPollLogs(action === 'start' || action === 'restart')
    try {
      const result =
        action === 'start'
          ? await startService(service.name)
          : action === 'stop'
            ? await stopService(service.name)
            : await restartService(service.name)
      terminal.appendOutput(`${result.output ?? ''}\n`)
      terminal.setStatus(result.ok ? 'ok' : 'fail')
      await refreshServices()
      if (action === 'stop') terminal.setPollLogs(false)
    } catch (e) {
      terminal.appendOutput(`\n${e instanceof Error ? e.message : 'Failed'}`)
      terminal.setStatus('fail')
      terminal.setPollLogs(false)
    } finally {
      setBusy(false)
    }
  }

  async function handleRunTests() {
    setTestRunning(true)
    terminal.setTitle(`Tests · ${venture.name}`)
    terminal.setStatus('running')
    terminal.setOutput('> Running registered tests…\n')
    terminal.setPollLogs(false)
    try {
      const r = await runVentureTests(venture.id)
      const output = formatTestOutput(r)
      terminal.setOutput(output)
      testTerminal.setOutput(output)
      testTerminal.setStatus(r.ok ? 'ok' : 'fail')
      terminal.setStatus(r.ok ? 'ok' : 'fail')
      setVentureTab('tests')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Test failed'
      terminal.setOutput(msg)
      terminal.setStatus('fail')
    } finally {
      setTestRunning(false)
    }
  }

  async function handleSync() {
    setSyncRunning(true)
    terminal.setTitle('Sync Kingdom')
    terminal.setStatus('running')
    terminal.setOutput('> npm run sync\n')
    terminal.setPollLogs(false)
    try {
      const r = await triggerSync()
      terminal.appendOutput(`${r.output ?? r.stdout ?? ''}\n`)
      terminal.setStatus(r.ok ? 'ok' : 'fail')
      if (r.ok) onRefresh?.()
      await refreshServices()
    } catch (e) {
      terminal.appendOutput(`\n${e instanceof Error ? e.message : 'Sync failed'}`)
      terminal.setStatus('fail')
    } finally {
      setSyncRunning(false)
    }
  }

  async function doCopy(label: string, text: string) {
    const ok = await copyText(text)
    if (ok) {
      setCopied(label)
      setTimeout(() => setCopied(null), 1500)
    }
  }

  return (
    <div className="venture-page">
      <header className="venture-page-head">
        <div className="venture-page-title">
          <ProgressDial value={venture.progress} size={56} />
          <div>
            <span className="badge">{venture.priority}</span>
            <h2>{venture.name}</h2>
            <p className="muted tiny">{venture.version}</p>
          </div>
        </div>
        <SegmentedControl
          value={ventureTab}
          onChange={(v) => setVentureTab(v as InspectorTab)}
          options={TABS}
        />
      </header>

      {ventureTab === 'run' && (
        <div className="venture-run">
          <ServiceControlBar
            service={service}
            busy={busy}
            apiOk={apiOk}
            selfHosted={selfHosted}
            testRunning={testRunning}
            syncRunning={syncRunning}
            readOnly={shareMode}
            onStart={() => void doServiceAction('start')}
            onStop={() => void doServiceAction('stop')}
            onRestart={() => void doServiceAction('restart')}
            onRunTests={() => void handleRunTests()}
            onSync={() => void handleSync()}
          />
          <OperationTerminal
            title={terminal.title}
            output={terminal.output}
            status={terminal.status}
            hint={`Output for ${venture.name} — switch ventures to see other logs.`}
            onClear={() => {
              terminal.clear()
              terminal.setPollLogs(false)
            }}
          />
          {venture.id === 'procedural-city' ? (
            <CityStageProofsPanel
              port={service?.port ?? registryEntry?.dashboard?.port ?? null}
              up={service?.status === 'up'}
            />
          ) : null}
          <DashboardEmbed
            port={service?.port ?? registryEntry?.dashboard?.port ?? null}
            up={service?.status === 'up' || selfHosted}
            embed={service?.embed !== false && !selfHosted}
            label={service?.label ?? registryEntry?.dashboard?.label}
            path={
              venture.id === 'comic-engine'
                ? '/v2a'
                : venture.id === 'procedural-city'
                  ? '/#proofs'
                  : '/'
            }
          />
        </div>
      )}

      {ventureTab !== 'run' && (
        <div className="venture-page-body">
          {ventureTab === 'overview' && (
            <>
              {agent ? (
                <div className="inspector-block">
                  <h4>Agent</h4>
                  <p className="strong">{agent.name}</p>
                  <p className="muted tiny">{agent.focus}</p>
                </div>
              ) : null}
              {manifest?.repo?.github ? (
                <div className="inspector-block">
                  <h4>GitHub</h4>
                  <a
                    href={`https://github.com/${manifest.repo.github.owner}/${manifest.repo.github.repo}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {manifest.repo.github.owner}/{manifest.repo.github.repo}
                  </a>
                </div>
              ) : manifest?.repo?.remote_url ? (
                <div className="inspector-block">
                  <h4>Git remote</h4>
                  <a href={manifest.repo.remote_url.replace(/\.git$/, '')} target="_blank" rel="noreferrer">
                    {manifest.repo.remote_url}
                  </a>
                </div>
              ) : venture.repoPath ? (
                <div className="inspector-block">
                  <h4>GitHub</h4>
                  <p className="muted tiny">No remote — create a repo and push (ask before each push).</p>
                </div>
              ) : null}
              {venture.id === 'whatsapp-voice' && whatsapp ? (
                <WhatsAppPhasesPanel data={whatsapp} />
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
              {suggestions.length ? (
                <div className="inspector-block">
                  <h4>Suggestions</h4>
                  <ul>
                    {suggestions.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {venture.repoPath ? (
                <button type="button" className="btn" onClick={() => void doCopy('repo', venture.repoPath!)}>
                  {copied === 'repo' ? 'Copied' : 'Copy repo path'}
                </button>
              ) : null}
              <p className="muted tiny">
                {lastSyncAt ? `Synced ${new Date(lastSyncAt).toLocaleString()}` : 'Run Sync from Run tab'}
              </p>
            </>
          )}

          {ventureTab === 'tech' && (
            <>
              {!manifest?.stats ? (
                <p className="muted">Sync Kingdom for tech census.</p>
              ) : (
                <>
                  <div className="inspector-block">
                    <h4>Repo stats</h4>
                    <p>
                      {manifest.stats.lines.toLocaleString()} lines · {manifest.stats.files.toLocaleString()} files
                    </p>
                    <p className="tiny">
                      Primary: <strong>{manifest.stats.primary_language ?? '—'}</strong>
                    </p>
                    {manifest.stats.truncated ? (
                      <p className="badge warn tiny">Sampled — LOC approximate</p>
                    ) : null}
                  </div>
                  {manifest.stats.languages.slice(0, 8).map((l) => (
                    <div key={l.language} className="lang-row">
                      <span>{l.language}</span>
                      <span className="tiny muted">{l.lines.toLocaleString()}</span>
                    </div>
                  ))}
                </>
              )}
            </>
          )}

          {ventureTab === 'architecture' &&
            (architecture?.section_titles?.length ? (
              <ArchitectureBoard
                architecture={architecture}
                experiments={experiments?.items ?? []}
                manifest={manifest}
                repoPath={venture.repoPath}
              />
            ) : (
              <p className="muted">Add architecture wiki and sync.</p>
            ))}

          {ventureTab === 'data' && (
            <>
              {dataSection?.tables?.map((table, ti) => (
                <table key={ti} className="data-table">
                  <thead>
                    <tr>{table.headers.map((h) => <th key={h}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {table.rows.map((row, ri) => (
                      <tr key={ri}>{row.map((cell, ci) => <td key={ci}>{cell}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              ))}
            </>
          )}

          {ventureTab === 'tests' && (
            <TestRunnerPanel
              ventureId={venture.id}
              registryEntry={registryEntry}
              cicd={cicd}
              apiOk={apiOk}
              readOnly={shareMode}
              logKey={testLogKey}
            />
          )}

          {ventureTab === 'experiments' && (
            <>
              {experiments?.items?.length ? (
                <ul className="exp-list">
                  {experiments.items.map((e) => (
                    <li key={`${e.date}-${e.summary}-${e.source ?? ''}`}>
                      <span className="badge ghost">{e.date}</span>
                      {e.source ? <span className="badge ghost tiny">{e.source}</span> : null}{' '}
                      {e.summary}
                      {e.video ? (
                        <video className="research-video" src={e.video} controls playsInline preload="metadata" />
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">No experiments logged.</p>
              )}
            </>
          )}

          {ventureTab === 'models' && (
            <>
              <p>
                Spend: ${manifest?.spend_usd ?? venture.spendUsd ?? '—'}
                {manifest?.ceiling_usd ?? venture.ceilingUsd
                  ? ` / $${manifest?.ceiling_usd ?? venture.ceilingUsd}`
                  : ''}
              </p>
              {manifest?.models_tested?.map((m) => (
                <p key={m.name} className="tiny">
                  <code>{m.name}</code> · {m.calls} calls · ${m.spend_usd.toFixed(2)}
                </p>
              ))}
            </>
          )}

          {ventureTab === 'cicd' && (
            <>
              {cicd?.github?.runs?.length ? (
                <ul className="ci-list">
                  {cicd.github.runs.map((r) => (
                    <li key={r.databaseId}>
                      <span className={`badge ${r.conclusion === 'success' ? 'ok' : 'warn'}`}>
                        {r.conclusion ?? r.status}
                      </span>{' '}
                      <a href={r.url} target="_blank" rel="noreferrer">{r.workflowName}</a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted tiny">No GitHub runs — sync after gh auth.</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
