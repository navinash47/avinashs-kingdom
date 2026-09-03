import { useMemo, useState, type MouseEvent } from 'react'
import type { CicdSnapshot, Venture, VentureManifest } from '../types'
import { useOrchestrator } from '../context/OrchestratorContext'
import {
  operationLogKey,
  useActiveOperationLog,
  useOperationLog,
  useOperationLogContext,
} from '../context/OperationLogContext'
import { useServiceStatus } from '../hooks/useServiceStatus'
import { useShareMode } from '../hooks/useShareMode'
import { formatProgress } from '../lib/progress'
import { OperationTerminal } from './OperationTerminal'
import {
  serviceForVenture,
  startAllServices,
  startService,
  stopAllServices,
  stopService,
} from '../lib/orchestratorApi'

type Props = {
  ventures: Venture[]
  manifests: Record<string, VentureManifest>
  cicd: Record<string, CicdSnapshot>
}

function ciDot(conclusion: string | null | undefined) {
  if (conclusion === 'success') return 'ci-ok'
  if (conclusion === 'failure') return 'ci-fail'
  return 'ci-none'
}

function tabLabel(key: string, services: { name: string; label: string }[] | null | undefined) {
  if (key === operationLogKey('fleet', 'global')) return 'Fleet'
  const name = key.replace(/^service:/, '')
  return (services ?? []).find((s) => s.name === name)?.label ?? name
}

export function FleetStrip({ ventures, cicd }: Props) {
  const { openVenture, setMainTab } = useOrchestrator()
  const shareMode = useShareMode()
  const { services, apiOk, refresh } = useServiceStatus()
  const { patchLog, appendLog, logs } = useOperationLogContext()
  const fleetLog = useOperationLog(operationLogKey('fleet', 'global'), 'Fleet · all dashboards')
  const { key: activeKey, entry, tabKeys, setActiveKey, clearLog } = useActiveOperationLog(
    operationLogKey('fleet', 'global'),
    'Fleet terminal',
  )
  const [busy, setBusy] = useState<string | null>(null)

  const rows = useMemo(() => {
    const active = ventures.filter((v) => v.status === 'active')
    const priorityOrder = { P0: 0, P1: 1, P2: 2, parked: 3 }
    return active.sort(
      (a, b) =>
        (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9) ||
        b.progress - a.progress,
    )
  }, [ventures])

  const tabs = useMemo(
    () =>
      tabKeys.map((key) => ({
        key,
        label: tabLabel(key, services),
      })),
    [tabKeys, services],
  )

  function openRun(id: string) {
    setMainTab('ventures')
    openVenture(id, 'run')
  }

  async function fleetAction(action: 'start-all' | 'stop-all') {
    if (!apiOk) return
    setBusy(action)
    fleetLog.setTitle(action === 'start-all' ? 'Start all dashboards' : 'Stop all dashboards')
    fleetLog.setStatus('running')
    fleetLog.setOutput(`> ${action}…\n`)
    try {
      const out = action === 'start-all' ? await startAllServices() : await stopAllServices()
      fleetLog.appendOutput(out.output ?? '')
      fleetLog.setStatus(out.ok ? 'ok' : 'fail')
      await refresh()
    } catch (e) {
      fleetLog.appendOutput(`\n${e instanceof Error ? e.message : 'Failed'}`)
      fleetLog.setStatus('fail')
    } finally {
      setBusy(null)
    }
  }

  async function toggleService(e: MouseEvent, ventureId: string, action: 'start' | 'stop') {
    e.stopPropagation()
    const svc = serviceForVenture(services, ventureId)
    if (!svc || !apiOk) return
    setBusy(svc.name)
    const serviceLog = operationLogKey('service', svc.name)
    setActiveKey(serviceLog)
    patchLog(serviceLog, {
      title: `${action} · ${svc.label}`,
      status: 'running',
      output: `> ${action} ${svc.name}…\n`,
      pollLogs: false,
    })
    try {
      const out = action === 'start' ? await startService(svc.name) : await stopService(svc.name)
      appendLog(serviceLog, out.output ?? '')
      patchLog(serviceLog, { status: out.ok ? 'ok' : 'fail' })
      await refresh()
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="panel fleet-strip">
      <header className="panel-head row-between">
        <div>
          <h2>Fleet control</h2>
          <p className="muted">
            {shareMode
              ? 'Live status mirror — Start/Stop runs on host Mac'
              : 'Live dashboard status · each app keeps its own log'}
          </p>
        </div>
        {!shareMode ? (
        <div className="fleet-actions">
          <button
            type="button"
            className="btn primary"
            disabled={!apiOk || busy !== null}
            onClick={() => void fleetAction('start-all')}
          >
            Start all
          </button>
          <button
            type="button"
            className="btn"
            disabled={!apiOk || busy !== null}
            onClick={() => void fleetAction('stop-all')}
          >
            Stop all
          </button>
        </div>
        ) : null}
      </header>
      {!apiOk ? (
        <p className="muted tiny fleet-api-hint">
          Restart <code>npm run dev</code> if fleet controls show offline
        </p>
      ) : null}
      <div className="fleet-table-wrap">
        <table className="fleet-table">
          <thead>
            <tr>
              <th>Venture</th>
              <th>Progress</th>
              <th>Dash</th>
              <th>CI</th>
              <th>Tests</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((v) => {
              const svc = serviceForVenture(services, v.id)
              const snap = cicd[v.id]
              const up = svc?.status === 'up'
              const conclusion = snap?.github?.last_conclusion ?? snap?.github?.runs?.[0]?.conclusion
              const lastTest = snap?.local_tests?.last_run
              const serviceKey = svc ? operationLogKey('service', svc.name) : null
              const hasLog = serviceKey ? Boolean(logs[serviceKey]?.output.trim()) : false
              return (
                <tr
                  key={v.id}
                  className="fleet-row"
                  role="button"
                  tabIndex={0}
                  onClick={() => openRun(v.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      openRun(v.id)
                    }
                  }}
                >
                  <td>
                    <span className="badge">{v.priority}</span> <strong>{v.name}</strong>
                    {hasLog ? <span className="badge ghost tiny">log</span> : null}
                  </td>
                  <td>{formatProgress(v.progress)}</td>
                  <td>
                    {svc ? (
                      <span className={`badge ${up ? 'ok' : 'warn'}`}>{up ? 'UP' : 'DOWN'}</span>
                    ) : (
                      <span className="muted tiny">—</span>
                    )}
                  </td>
                  <td>
                    <span className={`ci-dot ${ciDot(conclusion)}`} title={conclusion ?? 'no runs'} />
                  </td>
                  <td>
                    {lastTest ? (
                      <span className={`badge ${lastTest.ok ? 'ok' : 'warn'}`}>
                        {lastTest.ok ? 'PASS' : 'FAIL'}
                      </span>
                    ) : (
                      <span className="muted tiny">—</span>
                    )}
                  </td>
                  <td className="fleet-row-actions" onClick={(e) => e.stopPropagation()}>
                    {svc && v.id !== 'kingdom-ops' && !shareMode ? (
                      <>
                        <button
                          type="button"
                          className="btn tiny-btn"
                          disabled={!apiOk || busy !== null || up}
                          onClick={(e) => void toggleService(e, v.id, 'start')}
                        >
                          Start
                        </button>
                        <button
                          type="button"
                          className="btn tiny-btn"
                          disabled={!apiOk || busy !== null || !up}
                          onClick={(e) => void toggleService(e, v.id, 'stop')}
                        >
                          Stop
                        </button>
                        {hasLog && serviceKey ? (
                          <button
                            type="button"
                            className="btn tiny-btn ghost"
                            onClick={() => setActiveKey(serviceKey)}
                          >
                            Log
                          </button>
                        ) : null}
                      </>
                    ) : null}
                    <button type="button" className="btn tiny-btn primary" onClick={() => openRun(v.id)}>
                      Open
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <OperationTerminal
        title={entry.title}
        output={entry.output}
        status={entry.status}
        tabs={tabs}
        activeTab={activeKey}
        onTabChange={setActiveKey}
        hint="Start/stop an app — its log appears in its own tab."
        onClear={() => clearLog(activeKey)}
      />
    </section>
  )
}
