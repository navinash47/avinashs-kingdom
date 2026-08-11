/**
 * Apply LinkedIn-sourced queued jobs (prefer external ATS URLs).
 * Same retry rules as auto-apply: ≤3 attempts → manual-apply (not applied).
 */
import {
  getDb,
  recordApplication,
  alreadyApplied,
  incrementAttempt,
  finalizeApplyAttempt,
  maxApplyAttempts,
  getAttemptCount,
  updateJobStatus,
} from '../src/db/client.js'
import { applyQueueItem } from '../src/apply/browser.js'

if (!process.env.JOB_JUGAAD_HUMAN_WAIT_MS && !process.env.JOB_JUGAAD_SKIP_HUMAN_WAIT) {
  process.env.JOB_JUGAAD_SKIP_HUMAN_WAIT = '1'
}

const maxAttempts = maxApplyAttempts()
const db = getDb()
const rows = db
  .prepare(
    `SELECT * FROM jobs
     WHERE source='linkedin-auth'
       AND status IN ('queued','waiting-on-you')
       AND attempt_count < ?
     ORDER BY
       CASE
         WHEN url LIKE '%ashby%' OR url LIKE '%greenhouse%' OR url LIKE '%lever%' THEN 0
         ELSE 1
       END,
       fit_score DESC
     LIMIT 4`,
  )
  .all(maxAttempts) as Array<{
  id: string
  company_id: string
  title: string
  url: string
  jd_text: string
  ats: string | null
  resume_track: string | null
  resume_path: string | null
  fit_score: number
  status: string
  updated_at: string
}>

console.log(`Applying ${rows.length} LinkedIn-sourced roles (maxAttempts=${maxAttempts})`)
for (const job of rows) {
  console.log(`\n=== ${job.company_id} — ${job.title}`)
  console.log(`  ${job.url}`)
  if (alreadyApplied(job.url) && job.status !== 'waiting-on-you') {
    console.log('  skip duplicate')
    continue
  }
  if (
    job.status === 'waiting-on-you' &&
    alreadyApplied(job.id, { allowRetryWaiting: true })
  ) {
    console.log('  skip — attempts exhausted / not retryable')
    continue
  }
  const attempt = incrementAttempt(job.id)
  updateJobStatus(job.id, 'filling')
  const result = await applyQueueItem({
    id: job.id,
    companyId: job.company_id,
    companyName: job.company_id,
    title: job.title,
    url: job.url,
    jdText: job.jd_text,
    ats: job.ats || 'linkedin',
    chosenResumeId: job.resume_track,
    chosenResumePath: job.resume_path,
    confidence: job.fit_score / 100,
    fitScore: job.fit_score,
    gaps: [],
    status: 'queued',
    updatedAt: job.updated_at,
  })
  const finalStatus = finalizeApplyAttempt(job.id, result.status, result.error)
  recordApplication({
    job_id: job.id,
    status: finalStatus,
    resume_track: job.resume_track,
    notes: `attempt ${attempt}/${maxAttempts}${result.error ? ` — ${result.error}` : ''}`,
  })
  console.log(
    `  → ${finalStatus}${result.error ? ` — ${result.error}` : ''} (attempt ${attempt}/${maxAttempts}; prior=${getAttemptCount(job.id)})`,
  )
}
console.log('done')
