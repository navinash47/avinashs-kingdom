import { useEffect, useRef } from 'react'

export type TerminalStatus = 'idle' | 'running' | 'ok' | 'fail'

type Props = {
  title: string
  output: string
  status: TerminalStatus
  hint?: string
  onClear?: () => void
  tabs?: { key: string; label: string }[]
  activeTab?: string
  onTabChange?: (key: string) => void
}

export function OperationTerminal({
  title,
  output,
  status,
  hint,
  onClear,
  tabs,
  activeTab,
  onTabChange,
}: Props) {
  const preRef = useRef<HTMLPreElement>(null)

  useEffect(() => {
    const el = preRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [output, status])

  const statusLabel =
    status === 'running'
      ? 'Running…'
      : status === 'ok'
        ? 'Done'
        : status === 'fail'
          ? 'Failed'
          : 'Ready'

  return (
    <section className={`operation-terminal status-${status}`} aria-label="Command output">
      {tabs && tabs.length > 1 ? (
        <div className="terminal-tabs" role="tablist" aria-label="Application logs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              className={`terminal-tab${activeTab === tab.key ? ' active' : ''}`}
              onClick={() => onTabChange?.(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      ) : null}
      <header className="terminal-head">
        <div>
          <strong>{title}</strong>
          <span className={`badge ${status === 'ok' ? 'ok' : status === 'fail' ? 'warn' : status === 'running' ? 'ghost' : 'ghost'}`}>
            {statusLabel}
          </span>
        </div>
        {onClear && output ? (
          <button type="button" className="btn ghost tiny-btn" onClick={onClear}>
            Clear
          </button>
        ) : null}
      </header>
      <pre ref={preRef} className="terminal-body">
        {output || hint || 'Output appears here when you Start, Sync, or Run tests.'}
      </pre>
    </section>
  )
}
