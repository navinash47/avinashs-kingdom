/**
 * Autonomous apply from SQLite queue.
 * Prefers main resume track (general). Headed browser; CAPTCHA pauses for human when TTY.
 * Safe for Cursor automations: `npm run auto:apply -- --limit 5`
 */
import {
  listJobs,
  recordApplication,
  updateJobStatus,
  jobStats,
} from '../src/db/client.js'
import { applyQueueItem } from '../src/apply/browser.js'
import type { QueueItem } from '../src/lib/paths.js'
import { loadCrawlConfig } from '../src/crawl/pipeline.js'
import { appendGapsExcel } from '../src/export/gaps-xlsx.js'
import { clearSessionSecrets } from '../src/secrets/prompt.js'
import { writeJson } from '../src/lib/paths.js'

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name)
  return i >= 0 ? process.argv[i + 1] : undefined
}

function toQueueItem(row: ReturnType<typeof listJobs>[0]): QueueItem {
  return {
    id: row.id,
    companyId: row.company_id,
    companyName: row.company_id,
    title: row.title,
    url: row.url,
    jdText: row.jd_text,
    ats: row.ats || 'unknown',
    chosenResumeId: row.resume_track,
    chosenResumePath: row.resume_path,
    confidence: row.fit_score / 100,
    fitScore: row.fit_score,
    gaps: [],
    status: 'queued',
    updatedAt: row.updated_at,
  }
}

async function main() {
  const cfg = loadCrawlConfig()
  const limit = Number(arg('--limit') || cfg.apply_batch_limit || 5)
  const minFit = Number(arg('--min-fit') || cfg.min_fit_to_queue || 55)
  const dry = process.argv.includes('--dry-run')

  const jobs = listJobs({
    status: 'queued',
    minFit,
    limit,
    diversifyCompanies: !process.argv.includes('--no-diversify'),
  })
  console.log(
    `Auto-apply: ${jobs.length} queued jobs (limit=${limit}, minFit=${minFit}, main resume preferred)`,
  )
  if (!jobs.length) {
    console.log('Nothing queued — run npm run crawl:jobs first')
    return
  }

  const results: Array<{ id: string; title: string; status: string; error?: string }> =
    []

  for (const job of jobs) {
    console.log(`\n=== ${job.company_id} — ${job.title} (${job.fit_score}) ===`)
    console.log(`  resume=${job.resume_track} source=${job.source}`)
    console.log(`  ${job.url}`)
    if (dry) {
      results.push({ id: job.id, title: job.title, status: 'dry-run' })
      continue
    }
    updateJobStatus(job.id, 'filling')
    const item = toQueueItem(job)
    const result = await applyQueueItem(item)
    updateJobStatus(job.id, result.status, result.error)
    recordApplication({
      job_id: job.id,
      status: result.status,
      resume_track: job.resume_track,
      notes: result.error || result.learnedQuestions?.join('; ') || null,
    })
    if (result.status === 'failed' && result.error) {
      await appendGapsExcel([
        {
          company: job.company_id,
          role: job.title,
          chosenResume: job.resume_track || 'general',
          gap: 'apply-failure',
          why: result.error,
          learnNext: 'Retry after CAPTCHA or fix profile field',
        },
      ])
    }
    results.push({
      id: job.id,
      title: job.title,
      status: result.status,
      error: result.error,
    })
    console.log(`  → ${result.status}${result.error ? ` — ${result.error}` : ''}`)
  }

  clearSessionSecrets()
  writeJson('data/auto-apply-report.json', {
    at: new Date().toISOString(),
    results,
    stats: jobStats(),
  })
  console.log('\nDone. Stats:', jobStats())
  console.log('Report → data/auto-apply-report.json')
}

main().catch((err) => {
  clearSessionSecrets()
  console.error(err)
  process.exit(1)
})
