/**
 * Apply LinkedIn-sourced queued jobs (prefer external ATS URLs).
 */
import {
  getDb,
  updateJobStatus,
  recordApplication,
  alreadyApplied,
} from '../src/db/client.js'
import { applyQueueItem } from '../src/apply/browser.js'

const db = getDb()
const rows = db
  .prepare(
    `SELECT * FROM jobs
     WHERE source='linkedin-auth' AND status='queued'
     ORDER BY
       CASE
         WHEN url LIKE '%ashby%' OR url LIKE '%greenhouse%' OR url LIKE '%lever%' THEN 0
         ELSE 1
       END,
       fit_score DESC
     LIMIT 4`,
  )
  .all() as Array<{
  id: string
  company_id: string
  title: string
  url: string
  jd_text: string
  ats: string | null
  resume_track: string | null
  resume_path: string | null
  fit_score: number
  updated_at: string
}>

console.log(`Applying ${rows.length} LinkedIn-sourced roles`)
for (const job of rows) {
  console.log(`\n=== ${job.company_id} — ${job.title}`)
  console.log(`  ${job.url}`)
  if (alreadyApplied(job.url)) {
    console.log('  skip duplicate')
    continue
  }
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
  updateJobStatus(job.id, result.status, result.error)
  recordApplication({
    job_id: job.id,
    status: result.status,
    resume_track: job.resume_track,
    notes: result.error || null,
  })
  console.log(`  → ${result.status}${result.error ? ` — ${result.error}` : ''}`)
}
console.log('done')
