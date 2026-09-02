import { useMemo, useState } from 'react'
import type {
  ArchitectureBundle,
  ArchitectureSection,
  ExperimentItem,
  VentureManifest,
} from '../types'
import { copyText } from '../lib/ventureUtils'

type Props = {
  architecture: ArchitectureBundle
  experiments?: ExperimentItem[] | null
  manifest?: VentureManifest | null
  repoPath?: string | null
}

function findSection(
  sections: Record<string, ArchitectureSection>,
  ...needles: string[]
): ArchitectureSection | null {
  const entries = Object.entries(sections)
  for (const needle of needles) {
    const hit = entries.find(([k]) => k.includes(needle))
    if (hit) return hit[1]
  }
  return null
}

function bulletLines(markdown: string | undefined): string[] {
  if (!markdown) return []
  return markdown
    .split('\n')
    .map((l) => l.replace(/^[-*]\s+/, '').replace(/\*\*/g, '').trim())
    .filter(Boolean)
}

function parseFlowNodes(ioSection: ArchitectureSection | null): { label: string; kind: 'in' | 'out' }[] {
  if (!ioSection?.markdown) return []
  const nodes: { label: string; kind: 'in' | 'out' }[] = []
  for (const line of bulletLines(ioSection.markdown)) {
    const inMatch = line.match(/^In:\s*(.+)$/i)
    const outMatch = line.match(/^Out:\s*(.+)$/i)
    if (inMatch) {
      for (const part of inMatch[1].split(/,\s*/)) {
        if (part.trim()) nodes.push({ label: part.trim(), kind: 'in' })
      }
    } else if (outMatch) {
      for (const part of outMatch[1].split(/,\s*/)) {
        if (part.trim()) nodes.push({ label: part.trim(), kind: 'out' })
      }
    }
  }
  return nodes
}

function githubUrl(manifest: VentureManifest | null | undefined): string | null {
  const gh = manifest?.repo?.github
  if (gh?.owner && gh?.repo) return `https://github.com/${gh.owner}/${gh.repo}`
  const remote = manifest?.repo?.remote_url
  if (!remote) return null
  const m = remote.match(/github\.com[/:]([^/]+)\/([^/.]+)/)
  return m ? `https://github.com/${m[1]}/${m[2]}` : remote.replace(/\.git$/, '')
}

export function ArchitectureBoard({ architecture, experiments, manifest, repoPath }: Props) {
  const [copied, setCopied] = useState(false)
  const sections = architecture.sections ?? {}

  const design = findSection(sections, 'system design', 'design')
  const io = findSection(sections, 'input', 'output', 'flow')
  const stores = findSection(sections, 'data store')
  const libs = findSection(sections, 'librar', 'key libr')
  const version = findSection(sections, 'version')
  const future = findSection(sections, 'future')

  const diagrams = useMemo(() => {
    const all = Object.values(sections).flatMap((s) => s.diagrams ?? [])
    return all.filter((d) => d.svg_inline || d.source)
  }, [sections])

  const flowNodes = useMemo(() => parseFlowNodes(io), [io])
  const gitHref = githubUrl(manifest)
  const gh = manifest?.repo?.github
  const expItems = (experiments ?? []).slice(0, 8)

  async function copyRepo() {
    const text = repoPath ?? manifest?.repo?.path ?? ''
    if (!text) return
    const ok = await copyText(text)
    if (ok) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    }
  }

  return (
    <div className="arch-board">
      {design?.markdown ? (
        <section className="arch-hero">
          <p className="eyebrow">System design</p>
          <p className="arch-lede">{design.markdown.replace(/\*\*/g, '')}</p>
        </section>
      ) : null}

      <section className="arch-card">
        <header className="arch-card-head">
          <h4>Pipeline</h4>
          <span className="muted tiny">flow</span>
        </header>
        {diagrams.some((d) => d.svg_inline) ? (
          diagrams.map((d, idx) =>
            d.svg_inline ? (
              <div
                key={idx}
                className="mermaid-svg arch-mermaid"
                dangerouslySetInnerHTML={{ __html: d.svg_inline }}
              />
            ) : null,
          )
        ) : flowNodes.length ? (
          <div className="arch-flow" role="list">
            {flowNodes.map((n, i) => (
              <div key={`${n.kind}-${n.label}`} className="arch-flow-item" role="listitem">
                {i > 0 ? <span className="arch-chev" aria-hidden="true">→</span> : null}
                <div className={`arch-node ${n.kind}`}>
                  <span className="badge ghost tiny">{n.kind}</span>
                  <strong>{n.label}</strong>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted tiny">Add a mermaid block or In/Out bullets in the architecture wiki.</p>
        )}
      </section>

      {stores?.tables?.[0] ? (
        <section className="arch-card">
          <header className="arch-card-head">
            <h4>Data stores</h4>
          </header>
          <div className="arch-store-grid">
            {stores.tables[0].rows.map((row) => (
              <article key={row.join('|')} className="arch-store">
                <strong>{row[0]}</strong>
                <span className="badge ghost">{row[1] ?? '—'}</span>
                <code className="tiny">{row[2] ?? ''}</code>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <div className="arch-split">
        <section className="arch-card">
          <header className="arch-card-head">
            <h4>Libraries / routing</h4>
          </header>
          <div className="arch-chips">
            {bulletLines(libs?.markdown).length ? (
              bulletLines(libs?.markdown).map((line) => (
                <span key={line} className="arch-chip">
                  {line}
                </span>
              ))
            ) : (
              <p className="muted tiny">—</p>
            )}
          </div>
        </section>

        <section className="arch-card">
          <header className="arch-card-head">
            <h4>Version</h4>
          </header>
          <ul className="arch-check">
            {bulletLines(version?.markdown).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          {future ? (
            <>
              <h5 className="arch-sub">Future</h5>
              <ul className="arch-check future">
                {bulletLines(future.markdown).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </>
          ) : null}
        </section>
      </div>

      <section className="arch-card arch-git">
        <header className="arch-card-head">
          <h4>Repository</h4>
          {gitHref ? <span className="badge ok">GitHub</span> : <span className="badge warn">No remote</span>}
        </header>
        {gitHref ? (
          <p>
            <a className="arch-git-link" href={gitHref} target="_blank" rel="noreferrer">
              {gh ? `${gh.owner}/${gh.repo}` : gitHref}
            </a>
          </p>
        ) : (
          <p className="muted tiny">No origin remote — sync after `git remote add`, or create a GitHub repo (ask before push).</p>
        )}
        {(repoPath || manifest?.repo?.path) && (
          <button type="button" className="btn tiny-btn" onClick={() => void copyRepo()}>
            {copied ? 'Copied' : 'Copy local path'}
          </button>
        )}
      </section>

      <section className="arch-card">
        <header className="arch-card-head">
          <h4>Experiments</h4>
          <span className="muted tiny">wiki + git</span>
        </header>
        {expItems.length ? (
          <ol className="arch-timeline">
            {expItems.map((e) => (
              <li key={`${e.date}-${e.summary}`}>
                <span className="badge ghost">{e.date}</span>
                {'source' in e && e.source ? (
                  <span className="badge ghost tiny">{String(e.source)}</span>
                ) : null}{' '}
                {e.summary}
              </li>
            ))}
          </ol>
        ) : (
          <p className="muted tiny">No experiments yet — add wiki bullets or sync git log.</p>
        )}
      </section>
    </div>
  )
}
