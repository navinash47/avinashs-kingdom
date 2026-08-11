import {
  type QueueItem,
  readJson,
  writeJson,
} from '../src/lib/paths.js'

const TEST_COMPANIES = new Set(['anthropic', 'openai', 'stripe'])

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name)
  return i >= 0 ? process.argv[i + 1] : undefined
}

function main() {
  const per = Number(arg('--per-company') || '1')
  const minFit = Number(arg('--min-fit') || '45')
  const queue = readJson<QueueItem[]>('data/queue.json', [])
  const preferred = queue.filter(
    (q) =>
      TEST_COMPANIES.has(q.companyId) &&
      (q.status === 'queued' || q.status === 'waiting-on-you') &&
      q.fitScore >= minFit,
  )

  const byCompany = new Map<string, QueueItem[]>()
  for (const q of preferred) {
    const list = byCompany.get(q.companyId) || []
    list.push(q)
    byCompany.set(q.companyId, list)
  }

  const selected: QueueItem[] = []
  for (const [companyId, items] of byCompany) {
    items.sort((a, b) => {
      if (b.fitScore !== a.fitScore) return b.fitScore - a.fitScore
      // Prefer specialized resumes over general
      const scoreTrack = (id: string | null) =>
        id && id !== 'general' ? 1 : 0
      return scoreTrack(b.chosenResumeId) - scoreTrack(a.chosenResumeId)
    })
    selected.push(...items.slice(0, per))
    console.log(
      `${companyId}: picked ${Math.min(per, items.length)} / ${items.length} candidates`,
    )
    for (const s of items.slice(0, per)) {
      console.log(
        `  → ${s.fitScore} ${s.chosenResumeId} ${s.title}\n    ${s.url}`,
      )
    }
  }

  // Mark non-selected test-company queued items as gap-only skip for this pass
  const selectedIds = new Set(selected.map((s) => s.id))
  const next = queue.map((q) => {
    if (!TEST_COMPANIES.has(q.companyId)) return q
    if (selectedIds.has(q.id)) {
      return { ...q, status: 'queued' as const, updatedAt: new Date().toISOString() }
    }
    if (q.status === 'queued') {
      return {
        ...q,
        status: 'gap-only' as const,
        error: 'Deferred — not top fit for live test pass',
        updatedAt: new Date().toISOString(),
      }
    }
    return q
  })

  writeJson('data/queue.json', next)
  writeJson('data/apply-targets.json', selected)
  console.log(`Wrote ${selected.length} apply targets → data/apply-targets.json`)
}

main()
