import { useEffect, useMemo, useRef, useState } from 'react'
import type { Agent, Venture, VentureRegistryEntry } from '../types'
import { fuzzyMatch } from '../lib/ventureUtils'
import { useOrchestrator } from '../context/OrchestratorContext'

type PaletteItem = {
  id: string
  label: string
  group: string
  keywords: string
  action: () => void
}

type Props = {
  ventures: Venture[]
  agents: Agent[]
  registry: VentureRegistryEntry[]
}

export function CommandPalette({ ventures, agents, registry }: Props) {
  const { paletteOpen, setPaletteOpen, openVenture, setMainTab, focusGraphNode } =
    useOrchestrator()
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const items = useMemo(() => {
    const list: PaletteItem[] = []

    for (const v of ventures) {
      list.push({
        id: `venture-${v.id}`,
        label: v.name,
        group: 'Ventures',
        keywords: `${v.id} ${v.priority} ${v.version}`,
        action: () => {
          setMainTab('ventures')
          openVenture(v.id, 'run')
        },
      })
      list.push({
        id: `graph-${v.id}`,
        label: `Focus in Graph · ${v.name}`,
        group: 'Graph',
        keywords: `${v.id} graph map topology`,
        action: () => focusGraphNode(`venture:${v.id}`),
      })
    }

    for (const a of agents) {
      list.push({
        id: `agent-${a.id}`,
        label: a.name,
        group: 'Agents',
        keywords: a.focus,
        action: () => {
          setMainTab('agents')
          openVenture(a.ventureId, 'overview')
        },
      })
    }

    for (const r of registry) {
      if (r.dashboard?.port) {
        list.push({
          id: `dash-${r.id}`,
          label: `Open ${r.dashboard.label}`,
          group: 'Dashboards',
          keywords: r.id,
          action: () => {
            setMainTab('ventures')
            openVenture(r.id, 'run')
          },
        })
      }
    }

    list.push({
      id: 'action-sync',
      label: 'Copy: npm run sync',
      group: 'Actions',
      keywords: 'sync kingdom refresh',
      action: () => void navigator.clipboard.writeText('npm run sync'),
    })
    list.push({
      id: 'action-dashboards',
      label: 'Copy: npm run dashboards',
      group: 'Actions',
      keywords: 'start dashboards',
      action: () => void navigator.clipboard.writeText('npm run dashboards'),
    })
    list.push({
      id: 'tab-throne',
      label: 'Go to Throne',
      group: 'Navigate',
      keywords: 'home overview',
      action: () => setMainTab('throne'),
    })
    list.push({
      id: 'tab-graph',
      label: 'Go to Graph',
      group: 'Navigate',
      keywords: 'map topology fleet nodes connections',
      action: () => setMainTab('graph'),
    })
    list.push({
      id: 'tab-research',
      label: 'Go to Research Lab',
      group: 'Navigate',
      keywords: 'research papers gpu beamdojo experiments videos lab',
      action: () => setMainTab('research'),
    })
    list.push({
      id: 'tab-ventures',
      label: 'Go to Ventures',
      group: 'Navigate',
      keywords: 'board projects',
      action: () => setMainTab('ventures'),
    })

    const q = query.trim()
    if (!q) return list
    return list.filter(
      (i) =>
        fuzzyMatch(q, i.label) ||
        fuzzyMatch(q, i.keywords) ||
        fuzzyMatch(q, i.group),
    )
  }, [ventures, agents, registry, query, openVenture, setMainTab, focusGraphNode])

  useEffect(() => {
    if (paletteOpen) {
      setQuery('')
      setActiveIdx(0)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [paletteOpen])

  useEffect(() => {
    setActiveIdx(0)
  }, [query])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setPaletteOpen(true)
      }
      if (e.key === 'Escape' && paletteOpen) {
        setPaletteOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [paletteOpen, setPaletteOpen])

  if (!paletteOpen) return null

  function runActive() {
    const item = items[activeIdx]
    if (item) {
      item.action()
      setPaletteOpen(false)
    }
  }

  return (
    <div
      className="palette-backdrop"
      role="presentation"
      onClick={() => setPaletteOpen(false)}
    >
      <div
        className="palette"
        role="dialog"
        aria-label="Command palette"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          className="palette-input"
          placeholder="Search ventures, agents, dashboards…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setActiveIdx((i) => Math.min(i + 1, items.length - 1))
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActiveIdx((i) => Math.max(i - 1, 0))
            }
            if (e.key === 'Enter') {
              e.preventDefault()
              runActive()
            }
          }}
        />
        <ul className="palette-list">
          {items.length === 0 ? (
            <li className="palette-empty muted">No matches</li>
          ) : (
            items.map((item, idx) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={`palette-item${idx === activeIdx ? ' active' : ''}`}
                  onMouseEnter={() => setActiveIdx(idx)}
                  onClick={() => {
                    item.action()
                    setPaletteOpen(false)
                  }}
                >
                  <span className="palette-label">{item.label}</span>
                  <span className="palette-group">{item.group}</span>
                </button>
              </li>
            ))
          )}
        </ul>
        <p className="palette-hint muted tiny">
          ↑↓ navigate · Enter select · Esc close · ⌘K anytime
        </p>
      </div>
    </div>
  )
}
