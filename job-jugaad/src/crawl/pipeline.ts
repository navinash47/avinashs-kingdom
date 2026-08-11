import { createHash } from 'node:crypto'
import type { CompaniesConfig, Company } from '../lib/paths.js'
import { readYaml } from '../lib/paths.js'
import { discoverForCompany, type DiscoveredJob } from '../discover/ats.js'
import { crawlPublicProfile } from '../profile/enrich.js'
import { upsertCompany, upsertJob } from '../db/client.js'
import { pickResumeForJd } from '../score/pick-resume.js'
import { isFullTimeRole } from '../jobs/full-time.js'
import { isUsRole } from '../jobs/location.js'
import { normalizeJobUrl } from '../jobs/url.js'

export type CrawlConfig = {
  default_resume_track: string
  queries: string[]
  linkedin_search_urls: string[]
  web_job_boards: Array<{ name: string; urls: string[] }>
  extra_companies: Company[]
  min_fit_to_queue: number
  specialized_margin: number
  apply_batch_limit: number
}

export function loadCrawlConfig(): CrawlConfig {
  return readYaml<CrawlConfig>('config/crawl-sources.yaml')
}

function slugCompany(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
}

function jobId(url: string): string {
  return createHash('sha1').update(url).digest('hex').slice(0, 16)
}

const JOB_URL_RE =
  /https?:\/\/(?:www\.)?(?:linkedin\.com\/jobs\/view\/\d+[^\s"'<>]*|boards\.greenhouse\.io\/[^/\s"'<>]+\/jobs\/\d+[^\s"'<>]*|job-boards\.greenhouse\.io\/[^/\s"'<>]+\/jobs\/\d+[^\s"'<>]*|jobs\.lever\.co\/[^/\s"'<>]+\/[a-f0-9-]+[^\s"'<>]*|jobs\.ashbyhq\.com\/[^/\s"'<>]+\/[a-f0-9-]+[^\s"'<>]*)/gi

const TITLE_HINT_RE =
  /(?:Software|Backend|Frontend|Full[-\s]?Stack|Machine Learning|ML|Data|Research|Applied AI|LLM|GenAI|Platform|Infrastructure|SRE|DevOps)\s+(?:Engineer|Developer|Scientist|Manager)?[^<\n|]{0,80}/gi

function extractJobsFromHtml(
  html: string,
  source: string,
): Array<{ title: string; url: string; company?: string }> {
  const found: Array<{ title: string; url: string; company?: string }> = []
  const urls = [...new Set((html.match(JOB_URL_RE) || []).map((u) => u.replace(/[),.;]+$/, '')))]
  for (const url of urls) {
    let title = 'Role'
    let company: string | undefined
    if (/linkedin\.com\/jobs\/view/i.test(url)) {
      company = 'linkedin-unknown'
      title = 'LinkedIn job'
    } else if (/greenhouse\.io\/([^/]+)/i.test(url)) {
      company = url.match(/greenhouse\.io\/([^/]+)/i)?.[1]
    } else if (/lever\.co\/([^/]+)/i.test(url)) {
      company = url.match(/lever\.co\/([^/]+)/i)?.[1]
    } else if (/ashbyhq\.com\/([^/]+)/i.test(url)) {
      company = url.match(/ashbyhq\.com\/([^/]+)/i)?.[1]
    }
    found.push({ title, url, company })
  }
  // Title heuristics near links
  const titles = html.match(TITLE_HINT_RE) || []
  for (let i = 0; i < Math.min(titles.length, found.length); i++) {
    found[i].title = titles[i].replace(/\s+/g, ' ').trim().slice(0, 120)
  }
  void source
  return found
}

export async function crawlLinkedInListings(
  urls: string[],
): Promise<DiscoveredJob[]> {
  const out: DiscoveredJob[] = []
  for (const url of urls) {
    console.log(`  LinkedIn listings: ${url}`)
    const html = await crawlPublicProfile(url)
    if (!html) {
      console.warn('    empty crawl (login wall or OmniRoute down)')
      continue
    }
    const jobs = extractJobsFromHtml(html, 'linkedin')
    console.log(`    extracted ${jobs.length} links`)
    for (const j of jobs) {
      const companyId = slugCompany(j.company || 'linkedin')
      out.push({
        companyId,
        companyName: j.company || 'LinkedIn',
        title: j.title,
        url: j.url,
        jdText: `${j.title} (from LinkedIn listing crawl)`,
        ats: /greenhouse|lever|ashby/i.test(j.url)
          ? j.url.includes('greenhouse')
            ? 'greenhouse'
            : j.url.includes('lever')
              ? 'lever'
              : 'ashby'
          : 'linkedin',
      })
    }
  }
  return out
}

export async function crawlWebBoards(
  boards: CrawlConfig['web_job_boards'],
): Promise<DiscoveredJob[]> {
  const out: DiscoveredJob[] = []
  for (const board of boards) {
    for (const url of board.urls) {
      console.log(`  Web/Firecrawl: ${url}`)
      // Prefer ATS JSON APIs when URL encodes a known board
      const gh = url.match(/[?&]for=([a-z0-9-]+)/i)
      if (gh) {
        const company: Company = {
          id: gh[1],
          name: gh[1],
          ats: 'greenhouse',
          board_token: gh[1],
          career_url: url,
        }
        const jobs = await discoverForCompany(company)
        out.push(...jobs)
        continue
      }
      const lever = url.match(/jobs\.lever\.co\/([^/?#]+)/i)
      if (lever) {
        const company: Company = {
          id: lever[1],
          name: lever[1],
          ats: 'lever',
          board_token: lever[1],
          career_url: url,
        }
        out.push(...(await discoverForCompany(company)))
        continue
      }
      const ashby = url.match(/jobs\.ashbyhq\.com\/([^/?#]+)/i)
      if (ashby) {
        const company: Company = {
          id: ashby[1],
          name: ashby[1],
          ats: 'ashby',
          board_token: ashby[1],
          career_url: url,
        }
        out.push(...(await discoverForCompany(company)))
        continue
      }
      const html = await crawlPublicProfile(url)
      const jobs = extractJobsFromHtml(html || '', 'firecrawl')
      for (const j of jobs) {
        out.push({
          companyId: slugCompany(j.company || board.name),
          companyName: j.company || board.name,
          title: j.title,
          url: j.url,
          jdText: j.title,
          ats: 'career_page',
        })
      }
    }
  }
  return out
}

export async function crawlConfiguredAts(): Promise<DiscoveredJob[]> {
  const base = readYaml<CompaniesConfig>('config/companies.yaml')
  const crawl = loadCrawlConfig()
  const companies = [...base.companies, ...(crawl.extra_companies || [])]
  const out: DiscoveredJob[] = []
  for (const c of companies) {
    upsertCompany({
      id: c.id,
      name: c.name,
      ats: c.ats,
      board_token: c.board_token,
      career_url: c.career_url,
      source: 'ats',
    })
    console.log(`  ATS ${c.name} (${c.ats})`)
    const jobs = await discoverForCompany(c)
    console.log(`    ${jobs.length} roles`)
    out.push(...jobs)
  }
  return out
}

const RELEVANT_TITLE =
  /software|backend|frontend|full.?stack|machine learning|ml engineer|llm|genai|applied ai|research engineer|platform engineer|infrastructure|data engineer|mle|robotics|distributed/i

export async function ingestDiscovered(
  jobs: DiscoveredJob[],
  source: string,
  opts: { preferMainResume?: boolean; specializedMargin?: number; minFit?: number } = {},
): Promise<number> {
  const preferMain = opts.preferMainResume !== false
  const margin = opts.specializedMargin ?? 0.12
  const minFit = opts.minFit ?? 55
  let n = 0
  for (const job of jobs) {
    if (!RELEVANT_TITLE.test(job.title) && source !== 'ats-filtered') {
      // still store but low relevance
    }
    upsertCompany({
      id: job.companyId,
      name: job.companyName,
      ats: job.ats,
      source,
    })
    const pick = await pickResumeForJd({
      jdText: job.jdText || job.title,
      company: job.companyName,
      role: job.title,
      useLlm: false,
      preferMainResume: preferMain,
      specializedMargin: margin,
    })
    const relevant = RELEVANT_TITLE.test(job.title) ? 1 : 0.3
    const fullTime = isFullTimeRole(job.title, job.jdText)
    const usOk = isUsRole(job.location, job.title, job.jdText)
    const status =
      fullTime && usOk && pick.fitScore >= minFit && relevant >= 1
        ? 'queued'
        : 'discovered'
    upsertJob({
      id: jobId(normalizeJobUrl(job.url)),
      company_id: job.companyId,
      title: job.title,
      url: normalizeJobUrl(job.url),
      location: job.location ?? null,
      source,
      ats: job.ats,
      jd_text: job.jdText,
      fit_score: pick.fitScore,
      resume_track: pick.track.id,
      resume_path: pick.track.filePath,
      status,
      relevance:
        relevant * (pick.fitScore / 100) * (fullTime ? 1 : 0.2) * (usOk ? 1 : 0.15),
    })
    n++
  }
  return n
}
