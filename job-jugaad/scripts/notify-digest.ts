/**
 * Email digest of Cloudflare / CAPTCHA / manual-apply (not applied) job links.
 * Intended every 15 minutes so you can apply manually.
 *
 *   npm run notify:digest
 */
import {
  listManualDigestJobs,
  getAttemptCount,
  jobStats,
} from '../src/db/client.js'
import { notifyManualDigest } from '../src/notify/email.js'
import { writeJson } from '../src/lib/paths.js'

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name)
  return i >= 0 ? process.argv[i + 1] : undefined
}

async function main() {
  const limit = Number(arg('--limit') || 40)
  const jobs = listManualDigestJobs(limit)
  console.log(`Manual digest candidates: ${jobs.length}`)

  const payload = jobs.map((j) => ({
    company: j.company_id,
    title: j.title,
    url: j.url,
    jobId: j.id,
    status: j.status,
    attempts: getAttemptCount(j.id),
    error: j.error,
    source: j.source,
  }))

  for (const j of payload) {
    console.log(
      `  • [${j.status}] ${j.company} — ${j.title} (attempts=${j.attempts})\n    ${j.url}`,
    )
  }

  const emailed = await notifyManualDigest(payload)
  writeJson('data/manual-digest-report.json', {
    at: new Date().toISOString(),
    emailed,
    count: payload.length,
    jobs: payload,
    stats: jobStats(),
  })
  console.log('Report → data/manual-digest-report.json')
  console.log('Stats:', jobStats())
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
