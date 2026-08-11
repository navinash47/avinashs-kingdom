import { useEffect, useMemo, useState, useTransition } from 'react'
import './app.css'

type Track = {
  id: string
  label: string
  keywords: string[]
  filePath: string
  summary: string
}

type QueueItem = {
  id: string
  companyName: string
  title: string
  url: string
  chosenResumeId: string | null
  fitScore: number
  status: string
  gaps: Array<{ gap: string; learnNext: string }>
  error?: string
}

type Payload = {
  tracks: Track[]
  queue: QueueItem[]
  generatedAt?: string
}

const STATUS_CLASS: Record<string, string> = {
  queued: 'st-queued',
  'gap-only': 'st-gap',
  filling: 'st-fill',
  'waiting-on-you': 'st-wait',
  submitted: 'st-ok',
  failed: 'st-fail',
}

export function App() {
  const [data, setData] = useState<Payload>({ tracks: [], queue: [] })
  const [jd, setJd] = useState('')
  const [pickPreview, setPickPreview] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    fetch('/api/state')
      .then((r) => r.json())
      .then((j) => setData(j))
      .catch(() => {
        // Vite static fallback: try relative JSON if API proxy absent
        Promise.all([
          fetch('/resume-index.json').then((r) => (r.ok ? r.json() : null)),
          fetch('/queue.json').then((r) => (r.ok ? r.json() : [])),
        ]).then(([index, queue]) => {
          setData({
            tracks: index?.tracks || [],
            queue: queue || [],
            generatedAt: index?.generatedAt,
          })
        })
      })
  }, [])

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const q of data.queue) c[q.status] = (c[q.status] || 0) + 1
    return c
  }, [data.queue])

  function previewPick() {
    startTransition(() => {
      const text = jd.toLowerCase()
      let best = data.tracks[0]
      let bestScore = -1
      for (const t of data.tracks) {
        let hit = 0
        for (const k of t.keywords) if (text.includes(k.toLowerCase())) hit++
        if (hit > bestScore) {
          bestScore = hit
          best = t
        }
      }
      setPickPreview(
        best
          ? `${best.label} (${best.id}) — file stays as-is: ${best.filePath}`
          : 'Index resumes first (npm run index:resumes)',
      )
    })
  }

  return (
    <div className="shell">
      <header className="hero">
        <p className="eyebrow">Kingdom · Agent Jugaad</p>
        <h1>Job Jugaad</h1>
        <p className="lede">
          Read the JD. Pick the best resume you already wrote. Apply headed —
          never rewrite the file.
        </p>
        <div className="cta-row">
          <a className="btn primary" href="#queue">
            Open queue
          </a>
          <a className="btn ghost" href="/gaps.xlsx" download>
            Download gaps Excel
          </a>
        </div>
      </header>

      <section className="band" aria-label="Resume library">
        <h2>Resume library</h2>
        <p className="sub">
          Read-only tracks from Desktop (fixtures when Desktop is missing).
          Job Jugaad never edits these files.
        </p>
        <ul className="tracks">
          {data.tracks.map((t) => (
            <li key={t.id}>
              <strong>{t.label}</strong>
              <span>{t.id}</span>
              <code>{t.filePath}</code>
            </li>
          ))}
          {!data.tracks.length && (
            <li className="empty">Run `npm run index:resumes`</li>
          )}
        </ul>
      </section>

      <section className="band" aria-label="JD picker">
        <h2>JD → best resume</h2>
        <p className="sub">Paste a JD to preview which track would be chosen.</p>
        <textarea
          value={jd}
          onChange={(e) => setJd(e.target.value)}
          placeholder="Paste job description…"
          rows={7}
        />
        <button className="btn primary" type="button" onClick={previewPick}>
          {pending ? 'Picking…' : 'Pick resume'}
        </button>
        {pickPreview && <p className="pick">{pickPreview}</p>}
      </section>

      <section className="band" id="queue" aria-label="Apply queue">
        <h2>Apply queue</h2>
        <p className="sub">
          Status strip:{' '}
          {Object.entries(counts)
            .map(([k, v]) => `${k} ${v}`)
            .join(' · ') || 'empty — run npm run discover'}
        </p>
        <div className="queue">
          {data.queue.map((q) => (
            <article key={q.id} className="row">
              <div>
                <h3>
                  {q.companyName} — {q.title}
                </h3>
                <p>
                  Resume <strong>{q.chosenResumeId || '—'}</strong> · fit{' '}
                  {q.fitScore}
                  {q.gaps?.length ? ` · ${q.gaps.length} gaps` : ''}
                </p>
                {q.error && <p className="err">{q.error}</p>}
              </div>
              <span className={`pill ${STATUS_CLASS[q.status] || ''}`}>
                {q.status}
              </span>
            </article>
          ))}
          {!data.queue.length && (
            <p className="empty">No jobs queued yet.</p>
          )}
        </div>
      </section>

      <footer>
        Secrets are prompted each apply run — never stored in .env.
      </footer>
    </div>
  )
}
