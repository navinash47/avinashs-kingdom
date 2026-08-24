import { useEffect, useMemo, useState } from 'react'
import type { Agent, Venture } from '../types'
import { ventureIdFromFocus } from '../lib/tab-url'

type SkillNode = { id: string; path?: string }
type GraphAgent = {
  id: string
  name: string
  venture_id: string
  focus: string
  skills: string[]
}

type SkillGraphFile = {
  synced_at?: string
  skills?: SkillNode[]
  agents?: GraphAgent[]
}

type Props = {
  agents: Agent[]
  ventures: Venture[]
  focusNode?: string | null
}

export function FleetGraph({ agents, ventures, focusNode }: Props) {
  const [file, setFile] = useState<SkillGraphFile | null>(null)
  const focusVenture = ventureIdFromFocus(focusNode)

  useEffect(() => {
    let cancelled = false
    void fetch(`/data/skill-graph.json?_=${Date.now()}`, { cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<SkillGraphFile>) : null))
      .then((data) => {
        if (!cancelled) setFile(data)
      })
      .catch(() => {
        if (!cancelled) setFile(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const graphAgents: GraphAgent[] = useMemo(() => {
    const fromState = agents.map((a) => ({
      id: a.id,
      name: a.name,
      venture_id: a.ventureId,
      focus: a.focus,
      skills: [] as string[],
    }))
    if (!file?.agents?.length) return fromState
    const byId = new Map(fromState.map((a) => [a.id, a]))
    for (const a of file.agents) byId.set(a.id, a)
    return [...byId.values()]
  }, [file, agents])

  const visible = focusVenture
    ? graphAgents.filter((a) => a.venture_id === focusVenture)
    : graphAgents

  const ventureName = (id: string) => ventures.find((v) => v.id === id)?.name ?? id

  return (
    <section className="panel fleet-graph" data-focus-venture={focusVenture ?? ''}>
      <header className="panel-head">
        <div>
          <h2>Fleet graph</h2>
          <p className="muted">
            Agents, ventures, and skills. Research Lab → Fleet graph focuses one venture.
          </p>
        </div>
        {focusVenture ? (
          <span className="badge">{ventureName(focusVenture)}</span>
        ) : (
          <span className="muted tiny">all ventures</span>
        )}
      </header>

      {!visible.length ? (
        <p className="muted">
          {focusVenture
            ? `No agents for ${ventureName(focusVenture)} (${focusVenture}). Run npm run sync.`
            : 'No agents in this fleet slice. Run npm run sync.'}
        </p>
      ) : (
        <div className="fleet-nodes">
          {visible.map((a) => (
            <article
              key={a.id}
              className={`fleet-node${a.venture_id === focusVenture ? ' focus' : ''}`}
            >
              <p className="eyebrow">{a.id}</p>
              <h3>{a.name}</h3>
              <p className="muted tiny">{ventureName(a.venture_id)}</p>
              <p>{a.focus}</p>
              {a.skills.length ? (
                <ul className="fleet-skills">
                  {a.skills.map((s) => (
                    <li key={s}>
                      <code>{s}</code>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted tiny">No skill map for this agent yet.</p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
