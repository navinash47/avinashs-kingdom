/**
 * Resume jobs stuck in waiting-on-you after you clear CAPTCHA in Cursor cloud.
 * Soft-allows re-open of the same URL (does not treat as a duplicate apply).
 *
 *   npm run resume:waiting -- --limit 5
 */
import {
  listJobs,
  recordApplication,
  updateJobStatus,
  jobStats,
  alreadyApplied,
} from '../src/db/client.js'
import { applyQueueItem } from '../src/apply/browser.js'
import type { QueueItem } from '../src/lib/paths.js'
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
  const limit = Number(arg('--limit') || 5)
  const jobs = listJobs({
    status: 'waiting-on-you',
    minFit: 0,
    limit,
    diversifyCompanies: false,
    fullTimeOnly: false,
    usOnly: false,
  }).filter((j) => !alreadyApplied(j.url, { allowWaitingResume: true }))

  console.log(
    `Resume waiting-on-you: ${jobs.length} job(s) (limit=${limit}). Clear CAPTCHA in cloud Chrome if still up.`,
  )
  if (!jobs.length) {
    console.log('Nothing waiting — check UI Jobs tab or run auto:apply.')
    return
  }

  const results: Array<{ id: string; title: string; status: string; error?: string }> =
    []

  for (const job of jobs) {
    console.log(`\n=== RESUME ${job.company_id} — ${job.title} ===`)
    console.log(`  ${job.url}`)
    if (alreadyApplied(job.url, { allowWaitingResume: true })) {
      console.log('  → skip — already submitted')
      continue
    }
    updateJobStatus(job.id, 'filling')
    const result = await applyQueueItem(toQueueItem(job))
    updateJobStatus(job.id, result.status, result.error)
    recordApplication({
      job_id: job.id,
      status: result.status,
      resume_track: job.resume_track,
      notes: result.error || result.learnedQuestions?.join('; ') || null,
    })
    results.push({
      id: job.id,
      title: job.title,
      status: result.status,
      error: result.error,
    })
    console.log(`  → ${result.status}${result.error ? ` — ${result.error}` : ''}`)
  }

  clearSessionSecrets()
  writeJson('data/resume-waiting-report.json', {
    at: new Date().toISOString(),
    results,
    stats: jobStats(),
  })
  console.log('\nDone. Stats:', jobStats())
}

main().catch((err) => {
  clearSessionSecrets()
  console.error(err)
  process.exit(1)
})
