import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { TerminalStatus } from '../components/OperationTerminal'

export type OperationLogEntry = {
  title: string
  output: string
  status: TerminalStatus
  pollLogs: boolean
  updatedAt: number
}

const EMPTY: OperationLogEntry = {
  title: 'Terminal',
  output: '',
  status: 'idle',
  pollLogs: false,
  updatedAt: 0,
}

type OperationLogContextValue = {
  logs: Record<string, OperationLogEntry>
  activeKey: string | null
  setActiveKey: (key: string | null) => void
  patchLog: (key: string, patch: Partial<OperationLogEntry>) => void
  appendLog: (key: string, chunk: string) => void
  clearLog: (key: string) => void
  listKeys: (prefix?: string) => string[]
}

const OperationLogContext = createContext<OperationLogContextValue | null>(null)

export function operationLogKey(kind: 'venture' | 'service' | 'fleet' | 'subs' | 'tests', id: string) {
  return `${kind}:${id}`
}

export function OperationLogProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs] = useState<Record<string, OperationLogEntry>>({})
  const [activeKey, setActiveKey] = useState<string | null>(null)

  const patchLog = useCallback((key: string, patch: Partial<OperationLogEntry>) => {
    setLogs((prev) => {
      const current = prev[key] ?? { ...EMPTY }
      return {
        ...prev,
        [key]: {
          ...current,
          ...patch,
          updatedAt: Date.now(),
        },
      }
    })
    setActiveKey(key)
  }, [])

  const appendLog = useCallback((key: string, chunk: string) => {
    setLogs((prev) => {
      const current = prev[key] ?? { ...EMPTY }
      return {
        ...prev,
        [key]: {
          ...current,
          output: `${current.output}${chunk}`,
          updatedAt: Date.now(),
        },
      }
    })
    setActiveKey(key)
  }, [])

  const clearLog = useCallback((key: string) => {
    setLogs((prev) => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
    setActiveKey((current) => (current === key ? null : current))
  }, [])

  const listKeys = useCallback(
    (prefix?: string) =>
      Object.keys(logs)
        .filter((k) => (prefix ? k.startsWith(prefix) : true))
        .filter((k) => logs[k]?.output.trim())
        .sort((a, b) => (logs[b]?.updatedAt ?? 0) - (logs[a]?.updatedAt ?? 0)),
    [logs],
  )

  const value = useMemo(
    () => ({ logs, activeKey, setActiveKey, patchLog, appendLog, clearLog, listKeys }),
    [logs, activeKey, patchLog, appendLog, clearLog, listKeys],
  )

  return (
    <OperationLogContext.Provider value={value}>{children}</OperationLogContext.Provider>
  )
}

export function useOperationLogContext() {
  const ctx = useContext(OperationLogContext)
  if (!ctx) throw new Error('useOperationLogContext must be used within OperationLogProvider')
  return ctx
}

export function useOperationLog(key: string, defaultTitle = 'Terminal') {
  const { logs, patchLog, appendLog, clearLog, setActiveKey } = useOperationLogContext()
  const entry = logs[key] ?? { ...EMPTY, title: defaultTitle }

  const activate = useCallback(() => setActiveKey(key), [key, setActiveKey])

  const setTitle = useCallback(
    (title: string) => patchLog(key, { title }),
    [key, patchLog],
  )

  const setOutput = useCallback(
    (output: string) => patchLog(key, { output }),
    [key, patchLog],
  )

  const appendOutput = useCallback(
    (chunk: string) => appendLog(key, chunk),
    [key, appendLog],
  )

  const setStatus = useCallback(
    (status: TerminalStatus) => patchLog(key, { status }),
    [key, patchLog],
  )

  const setPollLogs = useCallback(
    (pollLogs: boolean) => patchLog(key, { pollLogs }),
    [key, patchLog],
  )

  const clear = useCallback(() => clearLog(key), [key, clearLog])

  return {
    ...entry,
    activate,
    setTitle,
    setOutput,
    appendOutput,
    setStatus,
    setPollLogs,
    clear,
    patch: (patch: Partial<OperationLogEntry>) => patchLog(key, patch),
  }
}

export function useActiveOperationLog(fallbackKey: string, fallbackTitle = 'Terminal') {
  const { logs, activeKey, setActiveKey, listKeys, clearLog } = useOperationLogContext()
  const key = activeKey && logs[activeKey] ? activeKey : fallbackKey
  const entry = logs[key] ?? { ...EMPTY, title: fallbackTitle }
  const serviceKeys = listKeys('service:')
  const fleetKey = logs[operationLogKey('fleet', 'global')]?.output
    ? operationLogKey('fleet', 'global')
    : null
  const tabKeys = [...(fleetKey ? [fleetKey] : []), ...serviceKeys]

  return {
    key,
    entry,
    tabKeys,
    setActiveKey,
    clearLog,
  }
}
