import { useEffect, useMemo, useState } from 'react'
import { useShareMode } from '../hooks/useShareMode'
import { useShareUrls } from '../hooks/useShareUrls'
import { MIRROR_REFRESH_EVENT } from '../lib/mirrorRefresh'
import type { CityStageProof, CityStageProofs } from '../types'

type Props = {
  port: number | null
  up: boolean
}

function assetUrl(base: string | null, rel: string | null | undefined) {
  if (!base || !rel) return null
  const clean = rel.replace(/^\.\//, '')
  if (clean.startsWith('reports/')) {
    return `${base.replace(/\/$/, '')}/${clean}`
  }
  return `${base.replace(/\/$/, '')}/${clean}`
}

function statusClass(status: string) {
  if (status === 'pass') return 'ok'
  if (status === 'fail') return 'bad'
  if (status === 'incomplete' || status === 'partial') return 'warn'
  return 'muted'
}

export function CityStageProofsPanel({ port, up }: Props) {
  const shareMode = useShareMode()
  const { publicDashboardUrl } = useShareUrls()
  const [seed, setSeed] = useState<CityStageProofs | null>(null)
  const [live, setLive] = useState<CityStageProof[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const base = useMemo(() => {
    if (shareMode) return publicDashboardUrl(port)
    if (!port) return null
    return `http://127.0.0.1:${port}`
  }, [shareMode, publicDashboardUrl, port])

  useEffect(() => {
    let cancelled = false
    const loadSeed = () => {
      void fetch(`/data/audits/city-stage-proofs.json?_=${Date.now()}`, { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          if (!cancelled && j?.proofs) setSeed(j as CityStageProofs)
        })
        .catch(() => {})
    }
    loadSeed()
    const onRefresh = () => loadSeed()
    window.addEventListener(MIRROR_REFRESH_EVENT, onRefresh)
    return () => {
      cancelled = true
      window.removeEventListener(MIRROR_REFRESH_EVENT, onRefresh)
    }
  }, [])

  useEffect(() => {
    if (!base || !up) {
      setLive(null)
      return
    }
    let cancelled = false
    const loadLive = () => {
      void fetch(`${base}/api/data?_=${Date.now()}`, { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          if (cancelled) return
          if (Array.isArray(j?.stage_proofs) && j.stage_proofs.length) {
            setLive(j.stage_proofs as CityStageProof[])
            setError(null)
          } else {
            setLive(null)
          }
        })
        .catch((e) => {
          if (!cancelled) setError(e instanceof Error ? e.message : 'Live proofs fetch failed')
        })
    }
    loadLive()
    const id = window.setInterval(loadLive, 15_000)
    const onRefresh = () => loadLive()
    window.addEventListener(MIRROR_REFRESH_EVENT, onRefresh)
    return () => {
      cancelled = true
      window.clearInterval(id)
      window.removeEventListener(MIRROR_REFRESH_EVENT, onRefresh)
    }
  }, [base, up])

  const proofs = live?.length ? live : seed?.proofs ?? []
  const withVideo = proofs.filter((p) => p.unity_video)

  return (
    <section className="city-proofs panel-block">
      <div className="city-proofs-head">
        <div>
          <h3>Stage verification proofs</h3>
          <p className="muted tiny">
            All stage gates + Unity walkthroughs (C/D).{' '}
            {live?.length
              ? 'Live from city dashboard'
              : seed?.synced_at
                ? `Synced ${new Date(seed.synced_at).toLocaleString()}`
                : 'Run Sync Kingdom after recording'}
          </p>
        </div>
        {!up ? (
          <span className="status-chip warn">Dashboard down</span>
        ) : proofs.length ? (
          <span className="status-chip ok">{proofs.length} proofs</span>
        ) : (
          <span className="status-chip warn">No proofs</span>
        )}
      </div>

      {error && !proofs.length ? <p className="muted tiny">{error}</p> : null}

      {!proofs.length ? (
        <p className="muted">
          No stage proofs yet — start the City dashboard, then Sync Kingdom (runs{' '}
          <code>refresh_dashboard</code>).
        </p>
      ) : (
        <>
          {withVideo.length ? (
            <div className="city-proof-videos">
              {withVideo.map((p) => {
                const src = assetUrl(base, p.unity_video)
                const poster = assetUrl(base, p.poster)
                if (!src) return null
                return (
                  <figure key={`vid-${p.id}`} className="city-proof-feature">
                    <video
                      className="city-proof-video"
                      controls
                      playsInline
                      preload="auto"
                      poster={poster ?? undefined}
                      src={src}
                    />
                    <figcaption>
                      <span className="strong">{p.title}</span>
                      <span className={`status-chip ${statusClass(p.status)}`}>{p.status}</span>
                    </figcaption>
                  </figure>
                )
              })}
            </div>
          ) : null}

          <div className="city-proof-grid">
            {proofs.map((p) => {
              const links: { label: string; href: string }[] = []
              const push = (label: string, rel: string | null | undefined) => {
                const href = assetUrl(base, rel)
                if (href) links.push({ label, href })
              }
              push('Terminal', p.terminal)
              push('Gate JSON', p.gate)
              push('Checklist', p.checklist)
              push('Unity report', p.unity_report)
              push('MP4', p.unity_video)
              return (
                <article key={p.id} className="city-proof-card">
                  <header>
                    <h4>{p.title}</h4>
                    <span className={`status-chip ${statusClass(p.status)}`}>{p.status}</span>
                  </header>
                  <div className="city-proof-links">
                    {links.length
                      ? links.map((l) => (
                          <a key={l.label} href={l.href} target="_blank" rel="noreferrer">
                            {l.label}
                          </a>
                        ))
                      : '—'}
                  </div>
                </article>
              )
            })}
          </div>
        </>
      )}
    </section>
  )
}
