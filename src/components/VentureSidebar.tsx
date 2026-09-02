import type { Venture } from '../types'
import { ProgressDial } from './ProgressDial'
import { useOrchestrator } from '../context/OrchestratorContext'

type Props = {
  ventures: Venture[]
  selectedId: string | null
}

export function VentureSidebar({ ventures, selectedId }: Props) {
  const { openVenture } = useOrchestrator()

  const rows = ventures
    .filter((v) => v.status !== 'parked')
    .sort((a, b) => {
      const p = { P0: 0, P1: 1, P2: 2, parked: 3 }
      return (p[a.priority] ?? 9) - (p[b.priority] ?? 9) || b.progress - a.progress
    })

  return (
    <aside className="venture-sidebar">
      <h3 className="sidebar-title">Ventures</h3>
      <ul className="venture-sidebar-list">
        {rows.map((v) => (
          <li key={v.id}>
            <button
              type="button"
              className={`venture-sidebar-item${selectedId === v.id ? ' active' : ''}`}
              onClick={() => openVenture(v.id, 'run')}
            >
              <ProgressDial value={v.progress} size={40} />
              <div>
                <span className="badge tiny">{v.priority}</span>
                <strong>{v.name}</strong>
                <span className="muted tiny">{v.progress}%</span>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  )
}
