/**
 * Layman feature map for the Throne (home) landing surface.
 * Keep copy non-engineer; link to tabs where useful.
 */
import { useOrchestrator } from '../context/OrchestratorContext'

type Feature = {
  title: string
  blurb: string
  tab?: string
}

const FEATURES: Feature[] = [
  {
    title: 'Command center',
    blurb:
      'One home screen for every project — who’s active, what’s next, and how the portfolio is weighted.',
    tab: 'throne',
  },
  {
    title: 'Fleet control',
    blurb:
      'Start or stop project dashboards from the Throne and watch live logs without juggling terminals.',
    tab: 'throne',
  },
  {
    title: 'Project workspaces',
    blurb:
      'Open any venture for status, architecture, experiments, CI, and next milestones in one pane.',
    tab: 'ventures',
  },
  {
    title: 'Brain / wiki',
    blurb:
      'A durable knowledge base agents keep updated — decisions, research notes, and ops pages you can reopen later.',
  },
  {
    title: 'Sync',
    blurb:
      'Pull the latest progress, expenses, and audits from every linked repo into this panel with one command.',
  },
  {
    title: 'MCP control',
    blurb:
      'Safe tool hooks so agents can read (and sometimes write) each project without copying secrets into chat.',
  },
  {
    title: 'Auto-wiki drafts',
    blurb:
      'Drop raw notes in the inbox; the system drafts wiki pages you promote only after a quick review.',
  },
  {
    title: 'Judge',
    blurb:
      'A second-pass checker that flags contradictions or shaky claims in the wiki before you trust them.',
  },
  {
    title: 'New venture',
    blurb:
      'Onboard a new project from a template so it shows up in the registry, Throne, and sync loop automatically.',
  },
  {
    title: 'Playbooks',
    blurb:
      'Step-by-step how-tos for daily ops — sync, research, outreach, tunnels — without reinventing the ritual.',
  },
  {
    title: 'Research lab',
    blurb:
      'Papers, GPU experiments, and training status for research-flavored projects in one lab view.',
    tab: 'research',
  },
  {
    title: 'Fleet graph',
    blurb:
      'A map of how ventures, agents, skills, and services connect — click a node to dig in.',
    tab: 'graph',
  },
  {
    title: 'Analytics',
    blurb:
      'Clickable charts for progress, phase effort, and spend so you can compare projects at a glance.',
    tab: 'analytics',
  },
  {
    title: 'Money & tokens',
    blurb:
      'Expenses, subscription kill list, and AI token burn — so burn stays visible against the monthly budget.',
    tab: 'expenses',
  },
  {
    title: 'Agents & Mac health',
    blurb:
      'Who owns each project, plus a Mac storage/speed audit when the machine is the bottleneck.',
    tab: 'agents',
  },
  {
    title: 'Command palette',
    blurb:
      'Press ⌘K to jump to a venture, graph node, or common action without hunting through tabs.',
  },
]

export function WhatYouGet() {
  const { setMainTab, setPaletteOpen } = useOrchestrator()

  return (
    <section className="panel what-you-get">
      <header className="panel-head">
        <h2>What you get</h2>
        <p className="muted">
          Kingdom is a personal operating system for your projects — plain-language map of the
          pieces
        </p>
      </header>
      <ul className="what-you-get-list" role="list">
        {FEATURES.map((f) => (
          <li key={f.title} className="what-you-get-row">
            <div className="what-you-get-copy">
              <strong>{f.title}</strong>
              <p>{f.blurb}</p>
            </div>
            {f.tab ? (
              <button
                type="button"
                className="btn tiny"
                onClick={() => setMainTab(f.tab!)}
              >
                Open
              </button>
            ) : f.title === 'Command palette' ? (
              <button
                type="button"
                className="btn tiny"
                onClick={() => setPaletteOpen(true)}
              >
                ⌘K
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  )
}
