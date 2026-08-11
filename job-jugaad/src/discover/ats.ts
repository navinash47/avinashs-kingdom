import { createHash } from 'node:crypto'
import type { Company, QueueItem } from '../lib/paths.js'
import { omniWebFetch } from '../omni/client.js'

export type DiscoveredJob = {
  companyId: string
  companyName: string
  title: string
  url: string
  jdText: string
  ats: string
}

async function fetchGreenhouse(company: Company): Promise<DiscoveredJob[]> {
  const token = company.board_token
  if (!token) return []
  const api = `https://boards-api.greenhouse.io/v1/boards/${token}/jobs?content=true`
  const res = await fetch(api)
  if (!res.ok) {
    console.warn(`Greenhouse ${token}: ${res.status}`)
    return []
  }
  const data = (await res.json()) as {
    jobs?: Array<{
      id: number
      title: string
      absolute_url: string
      content?: string
    }>
  }
  return (data.jobs || []).map((j) => ({
    companyId: company.id,
    companyName: company.name,
    title: j.title,
    url: normalizeGreenhouseUrl(company.board_token || company.id, j),
    jdText: stripHtml(j.content || j.title),
    ats: 'greenhouse',
  }))
}

function normalizeGreenhouseUrl(
  token: string,
  j: { id: number; absolute_url: string },
): string {
  const abs = j.absolute_url || ''
  const ghJid = abs.match(/gh_jid=(\d+)/)?.[1]
  if (ghJid || /stripe\.com\/jobs/i.test(abs)) {
    return `https://boards.greenhouse.io/${token}/jobs/${ghJid || j.id}`
  }
  return abs || `https://boards.greenhouse.io/${token}/jobs/${j.id}`
}

async function fetchLever(company: Company): Promise<DiscoveredJob[]> {
  const token = company.board_token
  if (!token) return []
  const api = `https://api.lever.co/v0/postings/${token}?mode=json`
  const res = await fetch(api)
  if (!res.ok) {
    console.warn(`Lever ${token}: ${res.status}`)
    return []
  }
  const data = (await res.json()) as Array<{
    id: string
    text: string
    hostedUrl: string
    descriptionPlain?: string
    description?: string
  }>
  return (data || []).map((j) => ({
    companyId: company.id,
    companyName: company.name,
    title: j.text,
    url: j.hostedUrl,
    jdText: j.descriptionPlain || stripHtml(j.description || j.text),
    ats: 'lever',
  }))
}

async function fetchAshby(company: Company): Promise<DiscoveredJob[]> {
  const token = company.board_token
  if (!token) return []
  const api = `https://api.ashbyhq.com/posting-api/job-board/${token}`
  const res = await fetch(api)
  if (!res.ok) {
    console.warn(`Ashby ${token}: ${res.status}`)
    return []
  }
  const data = (await res.json()) as {
    jobs?: Array<{
      title: string
      jobUrl: string
      descriptionHtml?: string
      descriptionPlain?: string
    }>
  }
  return (data.jobs || []).map((j) => ({
    companyId: company.id,
    companyName: company.name,
    title: j.title,
    url: j.jobUrl,
    jdText: j.descriptionPlain || stripHtml(j.descriptionHtml || j.title),
    ats: 'ashby',
  }))
}

async function fetchCareerPage(company: Company): Promise<DiscoveredJob[]> {
  if (!company.career_url) return []
  try {
    const md = await omniWebFetch(company.career_url, { provider: 'firecrawl' })
    return [
      {
        companyId: company.id,
        companyName: company.name,
        title: `${company.name} careers (page snapshot)`,
        url: company.career_url,
        jdText: md.slice(0, 12000),
        ats: 'career_page',
      },
    ]
  } catch (err) {
    console.warn(
      `Firecrawl fallback failed for ${company.id}:`,
      err instanceof Error ? err.message : err,
    )
    return []
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function discoverForCompany(
  company: Company,
): Promise<DiscoveredJob[]> {
  if (company.ats === 'greenhouse') {
    const jobs = await fetchGreenhouse(company)
    if (jobs.length) return jobs
  } else if (company.ats === 'lever') {
    const jobs = await fetchLever(company)
    if (jobs.length) return jobs
  } else if (company.ats === 'ashby') {
    const jobs = await fetchAshby(company)
    if (jobs.length) return jobs
  }
  return fetchCareerPage(company)
}

export function toQueueItem(
  job: DiscoveredJob,
  pick: {
    chosenResumeId: string | null
    chosenResumePath: string | null
    confidence: number
    fitScore: number
    gaps: QueueItem['gaps']
  },
  minFit = 45,
): QueueItem {
  const status = pick.fitScore < minFit ? 'gap-only' : 'queued'
  const idHash = createHash('sha1').update(job.url).digest('hex').slice(0, 12)
  return {
    id: `${job.companyId}-${idHash}`,
    companyId: job.companyId,
    companyName: job.companyName,
    title: job.title,
    url: job.url,
    jdText: job.jdText,
    ats: job.ats,
    chosenResumeId: pick.chosenResumeId,
    chosenResumePath: pick.chosenResumePath,
    confidence: pick.confidence,
    fitScore: pick.fitScore,
    gaps: pick.gaps,
    status,
    updatedAt: new Date().toISOString(),
  }
}
