import { useEffect, useState } from 'react'
import type { CicdSnapshot, VentureRegistryEntry } from '../types'
import {
  runSingleTest,
  runVentureTests,
  formatTestOutput,
  type TestRunResult,
} from '../lib/orchestratorApi'
import { useOperationLog } from '../context/OperationLogContext'
import { OperationTerminal } from './OperationTerminal'

type Props = {
  ventureId: string
  registryEntry: VentureRegistryEntry | null
  cicd: CicdSnapshot | null
  apiOk: boolean
  readOnly?: boolean
  logKey: string
}

export function TestRunnerPanel({
  ventureId,
  registryEntry,
  cicd,
  apiOk,
  readOnly,
  logKey,
}: Props) {
  const [running, setRunning] = useState<string | null>(null)
  const terminal = useOperationLog(logKey, `Tests · ${ventureId}`)
  const [lastResult, setLastResult] = useState<TestRunResult | null>(
    cicd?.local_tests?.last_run
      ? {
          ok: cicd.local_tests.last_run.ok,
          venture_id: ventureId,
          ran_at: cicd.local_tests.last_run.ran_at,
          duration_ms: cicd.local_tests.last_run.duration_ms,
          results: cicd.local_tests.last_run.results,
        }
      : null,
  )
  const commands = registryEntry?.tests?.commands ?? []

  useEffect(() => {
    if (terminal.output || !cicd?.local_tests?.last_run) return
    terminal.setOutput(
      formatTestOutput({
        ok: cicd.local_tests.last_run.ok,
        results: cicd.local_tests.last_run.results,
      }),
    )
    terminal.setStatus(cicd.local_tests.last_run.ok ? 'ok' : 'fail')
  }, [cicd, terminal.output, terminal.setOutput, terminal.setStatus])

  function pushTerminal(title: string, result: TestRunResult) {
    const output = formatTestOutput(result)
    terminal.setTitle(title)
    terminal.setOutput(output)
    terminal.setStatus(result.ok ? 'ok' : 'fail')
  }

  async function runAll() {
    if (!apiOk) return
    setRunning('all')
    terminal.setStatus('running')
    terminal.setOutput('> Running all tests…\n')
    try {
      const result = await runVentureTests(ventureId)
      setLastResult(result)
      pushTerminal(`Tests · ${ventureId}`, result)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Test run failed'
      terminal.setOutput(msg)
      terminal.setStatus('fail')
    } finally {
      setRunning(null)
    }
  }

  async function runOne(testId: string) {
    if (!apiOk) return
    setRunning(testId)
    terminal.setStatus('running')
    const cmd = commands.find((c) => c.id === testId)
    terminal.setOutput(`> ${cmd?.cmd ?? testId}\n`)
    try {
      const result = await runSingleTest(ventureId, testId)
      setLastResult(result)
      pushTerminal(`Test · ${cmd?.label ?? testId}`, result)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Test run failed'
      terminal.setOutput(msg)
      terminal.setStatus('fail')
    } finally {
      setRunning(null)
    }
  }

  if (!commands.length) {
    return (
      <div className="test-runner">
        <p className="muted">No tests registered for this venture.</p>
      </div>
    )
  }

  return (
    <div className="test-runner">
      <OperationTerminal
        title={terminal.title}
        output={terminal.output}
        status={terminal.status}
        hint={`Test output for this venture only.`}
        onClear={() => {
          terminal.clear()
          terminal.setStatus('idle')
        }}
      />

      <header className="test-runner-head">
        <h4>Local tests</h4>
        {!readOnly ? (
        <button
          type="button"
          className="btn primary"
          disabled={!apiOk || running !== null}
          onClick={() => void runAll()}
        >
          {running === 'all' ? 'Running…' : 'Run all tests'}
        </button>
        ) : (
          <span className="muted tiny">Tests run on host Mac</span>
        )}
      </header>

      <ul className="test-list">
        {commands.map((c) => (
          <li key={c.id} className="test-row">
            <div className="test-meta">
              <strong>{c.label}</strong>
              <span className="badge ghost">{c.type}</span>
              {c.description ? <p className="muted tiny">{c.description}</p> : null}
              <code className="tiny">{c.cmd}</code>
            </div>
            <button
              type="button"
              className="btn"
              disabled={!apiOk || running !== null || readOnly}
              onClick={() => void runOne(c.id)}
            >
              {running === c.id ? '…' : 'Run'}
            </button>
          </li>
        ))}
      </ul>

      {lastResult ? (
        <div className={`test-results ${lastResult.ok ? 'pass' : 'fail'}`}>
          <p className="strong">
            {lastResult.ok ? 'PASS' : 'FAIL'}
            {lastResult.duration_ms != null ? ` · ${lastResult.duration_ms}ms` : ''}
          </p>
        </div>
      ) : null}
    </div>
  )
}
