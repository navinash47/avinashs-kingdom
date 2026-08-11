/**
 * Autonomous apply from SQLite queue.
 * Retries the same job id up to JOB_JUGAAD_MAX_ATTEMPTS (default 3).
 * After exhaustion → status=manual-apply (not applied) for human apply via digest.
 * US full-time only by default; never re-applies submitted URLs.
 */
import {
  listJobs,
  recordApplication,
  jobStats,
  alreadyApplied,
  insertGap,
  incrementAttempt,
  finalizeApplyAttempt,
  maxApplyAttempts,
  getAttemptCount,
} from '../src/db/client.js'
import { updateJobStatus } from '../src/db/client.js'
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

async function pickJobs(limit: number, minFit: number) {
  const queued = listJobs({
    status: 'queued',
    minFit,
    limit: limit * 3,
    diversifyCompanies: !process.argv.includes('--no-diversify'),
    preferFreshCompanies: !process.argv.includes('--allow-repeat-company'),
    fullTimeOnly: !process.argv.includes('--allow-intern'),
    usOnly: !process.argv.includes('--allow-non-us'),
  }).filter((j) => !alreadyApplied(j.id) && !alreadyApplied(j.url))

  // Retry same jid while attempt_count < max (Cloudflare / CAPTCHA recoveries)
  const waiting = listJobs({
    status: 'waiting-on-you',
    minFit: 0,
    limit: limit * 2,
    diversifyCompanies: false,
    fullTimeOnly: false,
    usOnly: false,
  }).filter(
    (j) =>
      !alreadyApplied(j.id, { allowRetryWaiting: true }) &&
      getAttemptCount(j.id) < maxApplyAttempts(),
  )

  const byId = new Map<string, (typeof queued)[0]>()
  for (const j of [...waiting, ...queued]) byId.set(j.id, j)
  return [...byId.values()].slice(0, limit)
}

async function main() {
  // Digest mode default: don't block 10m on CAPTCHA — email + retry / manual-apply
  if (!process.env.JOB_JUGAAD_HUMAN_WAIT_MS && !process.env.JOB_JUGAAD_SKIP_HUMAN_WAIT) {
    process.env.JOB_JUGAAD_SKIP_HUMAN_WAIT = '1'
  }

  const cfg = loadCrawlConfig()
  const limit = Number(arg('--limit') || cfg.apply_batch_limit || 5)
  const minFit = Number(arg('--min-fit') || cfg.min_fit_to_queue || 55)
  const dry = process.argv.includes('--dry-run')
  const maxAttempts = maxApplyAttempts()

  const jobs = await pickJobs(limit, minFit)

  console.log(
    `Auto-apply: ${jobs.length} jobs (limit=${limit}, minFit=${minFit}, maxAttempts=${maxAttempts})`,
  )
  if (!jobs.length) {
    console.log('Nothing queued — run npm run crawl:jobs / crawl:linkedin:auth first')
    return
  }

  const results: Array<{
    id: string
    title: string
    status: string
    attempts?: number
    error?: string
  }> = []

  for (const job of jobs) {
    const prior = getAttemptCount(job.id)
    console.log(`\n=== ${job.company_id} — ${job.title} (${job.fit_score}) ===`)
    console.log(
      `  resume=${job.resume_track} loc=${job.location || '—'} source=${job.source} attempts=${prior}/${maxAttempts}`,
    )
    console.log(`  ${job.url}`)
    if (alreadyApplied(job.url) && job.status !== 'waiting-on-you') {
      console.log('  → skip — already applied this job link')
      results.push({ id: job.id, title: job.title, status: 'skipped-duplicate' })
      continue
    }
    if (dry) {
      results.push({ id: job.id, title: job.title, status: 'dry-run' })
      continue
    }

    const attempt = incrementAttempt(job.id)
    updateJobStatus(job.id, 'filling')
    const item = toQueueItem(job)
    const result = await applyQueueItem(item)
    const finalStatus = finalizeApplyAttempt(job.id, result.status, result.error)
    recordApplication({
      job_id: job.id,
      status: finalStatus,
      resume_track: job.resume_track,
      notes:
        `attempt ${attempt}/${maxAttempts}` +
        (result.error || result.learnedQuestions?.length
          ? ` — ${result.error || result.learnedQuestions?.join('; ')}`
          : ''),
    })
    if (finalStatus === 'failed' && result.error) {
      insertGap({
        company: job.company_id,
        role: job.title,
        job_id: job.id,
        chosen_resume: job.resume_track,
        gap: 'apply-failure',
        why: result.error,
        learn_next: 'Retry after CAPTCHA or fix profile field',
      })
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
    if (finalStatus === 'manual-apply') {
      insertGap({
        company: job.company_id,
        role: job.title,
        job_id: job.id,
        chosen_resume: job.resume_track,
        gap: 'manual-apply',
        why: result.error || 'Auto-apply exhausted after retries',
        learn_next: 'Apply manually via digest email link',
      })
    }
    results.push({
      id: job.id,
      title: job.title,
      status: finalStatus,
      attempts: attempt,
      error: result.error,
    })
    console.log(
      `  → ${finalStatus}${result.error ? ` — ${result.error}` : ''} (attempt ${attempt}/${maxAttempts})`,
    )
    if (result.emailed) {
      console.log('  📧 CAPTCHA email sent — digest also lists this every 15m')
    }
  }

  clearSessionSecrets()
  writeJson('data/auto-apply-report.json', {
    at: new Date().toISOString(),
    maxAttempts,
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
