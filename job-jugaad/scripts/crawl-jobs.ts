import { buildResumeIndex } from '../src/score/index-resumes.js'
import {
  crawlConfiguredAts,
  crawlLinkedInListings,
  crawlWebBoards,
  ingestDiscovered,
  loadCrawlConfig,
} from '../src/crawl/pipeline.js'
import { jobStats, listJobs } from '../src/db/client.js'
import { writeJson } from '../src/lib/paths.js'

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name)
  return i >= 0 ? process.argv[i + 1] : undefined
}

async function main() {
  buildResumeIndex()
  const cfg = loadCrawlConfig()
  const skipLinkedIn = process.argv.includes('--skip-linkedin')
  const skipWeb = process.argv.includes('--skip-web')
  const only = arg('--only') // ats | linkedin | web

  console.log('Job Jugaad crawl → SQLite (main resume = general / Avinash Resume)')

  let total = 0
  if (!only || only === 'ats') {
    console.log('\n== ATS boards ==')
    const jobs = await crawlConfiguredAts()
    total += await ingestDiscovered(jobs, 'ats', {
      preferMainResume: true,
      specializedMargin: cfg.specialized_margin,
      minFit: cfg.min_fit_to_queue,
    })
  }

  if ((!only || only === 'web') && !skipWeb) {
    console.log('\n== Web / Firecrawl boards ==')
    const jobs = await crawlWebBoards(cfg.web_job_boards)
    total += await ingestDiscovered(jobs, 'web', {
      preferMainResume: true,
      specializedMargin: cfg.specialized_margin,
      minFit: cfg.min_fit_to_queue,
    })
  }

  if ((!only || only === 'linkedin') && !skipLinkedIn) {
    console.log('\n== LinkedIn listings (no Easy Apply) ==')
    const jobs = await crawlLinkedInListings(cfg.linkedin_search_urls)
    total += await ingestDiscovered(jobs, 'linkedin', {
      preferMainResume: true,
      specializedMargin: cfg.specialized_margin,
      minFit: cfg.min_fit_to_queue,
    })
  }

  const stats = jobStats()
  const queued = listJobs({ status: 'queued', minFit: cfg.min_fit_to_queue, limit: 50 })
  writeJson('data/crawl-report.json', {
    at: new Date().toISOString(),
    ingested: total,
    stats,
    topQueued: queued.slice(0, 20).map((j) => ({
      company: j.company_id,
      title: j.title,
      fit: j.fit_score,
      resume: j.resume_track,
      source: j.source,
      url: j.url,
    })),
  })
  console.log('\nIngested rows this run:', total)
  console.log('DB status counts:', stats)
  console.log('Queued for apply:', queued.length)
  console.log('Report → data/crawl-report.json')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
