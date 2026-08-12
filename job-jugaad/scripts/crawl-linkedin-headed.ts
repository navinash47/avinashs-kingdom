/**
 * Optional headed LinkedIn job-listing harvest (no Easy Apply).
 * Opens public LinkedIn jobs search pages, extracts /jobs/view/ and ATS links.
 * Requires DISPLAY / Mac. Does not log into LinkedIn Easy Apply.
 */
import { loadCrawlConfig, ingestDiscovered } from '../src/crawl/pipeline.js'
import type { DiscoveredJob } from '../src/discover/ats.js'
import { buildResumeIndex } from '../src/score/index-resumes.js'
import { launchJobBrowser } from '../src/apply/launch.js'

const JOB_URL_RE =
  /https?:\/\/(?:www\.)?(?:linkedin\.com\/jobs\/view\/\d+[^\s"'<>]*|boards\.greenhouse\.io\/[^/\s"'<>]+\/jobs\/\d+[^\s"'<>]*|jobs\.lever\.co\/[^/\s"'<>]+\/[a-f0-9-]+[^\s"'<>]*|jobs\.ashbyhq\.com\/[^/\s"'<>]+\/[a-f0-9-]+[^\s"'<>]*)/gi

async function main() {
  buildResumeIndex()
  const cfg = loadCrawlConfig()
  const context = await launchJobBrowser({
    userDataDir: 'data/browser-profile-linkedin',
    viewport: { width: 1280, height: 900 },
  })
  const page = context.pages()[0] || (await context.newPage())
  const found: DiscoveredJob[] = []

  try {
    for (const url of cfg.linkedin_search_urls) {
      console.log('Open', url)
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 })
      await page.waitForTimeout(4000)
      // Scroll to load results
      for (let i = 0; i < 6; i++) {
        await page.mouse.wheel(0, 1600)
        await page.waitForTimeout(800)
      }
      const html = await page.content()
      const urls = [
        ...new Set(
          (html.match(JOB_URL_RE) || []).map((u) => u.replace(/[),.;]+$/, '')),
        ),
      ]
      console.log(`  links=${urls.length}`)
      for (const u of urls) {
        found.push({
          companyId: 'linkedin',
          companyName: 'LinkedIn',
          title: 'LinkedIn listing',
          url: u,
          jdText: 'LinkedIn listing (headed harvest)',
          ats: /greenhouse|lever|ashby/i.test(u) ? 'ats_via_linkedin' : 'linkedin',
        })
      }
    }
  } finally {
    await context.close().catch(() => undefined)
  }

  const n = await ingestDiscovered(found, 'linkedin-headed', {
    preferMainResume: true,
    specializedMargin: cfg.specialized_margin,
    minFit: cfg.min_fit_to_queue,
  })
  console.log(`Ingested ${n} LinkedIn-harvested links`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
