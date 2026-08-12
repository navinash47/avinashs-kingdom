import {
  type CompaniesConfig,
  type QueueItem,
  readYaml,
  writeJson,
  readJson,
} from '../src/lib/paths.js'
import { discoverForCompany, toQueueItem } from '../src/discover/ats.js'
import { buildResumeIndex } from '../src/score/index-resumes.js'
import { pickResumeForJd } from '../src/score/pick-resume.js'
import { appendGapsExcel } from '../src/export/gaps-xlsx.js'

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name)
  return i >= 0 ? process.argv[i + 1] : undefined
}

async function main() {
  buildResumeIndex()
  const cfg = readYaml<CompaniesConfig>('config/companies.yaml')
  const only = arg('--company')
  const companies = only
    ? cfg.companies.filter((c) => c.id === only || c.name === only)
    : cfg.companies

  const titleFilter = (arg('--title') || '').toLowerCase()
  const titleParts = titleFilter
    ? titleFilter.split(/[|,]/).map((s) => s.trim()).filter(Boolean)
    : []
  const queue: QueueItem[] = []
  const allGaps = []

  for (const company of companies) {
    console.log(`Discovering ${company.name} (${company.ats})…`)
    const jobs = await discoverForCompany(company)
    console.log(`  ${jobs.length} roles`)
    for (const job of jobs) {
      if (
        titleParts.length &&
        !titleParts.some((p) => job.title.toLowerCase().includes(p))
      ) {
        continue
      }
      // Skip huge career-page snapshots for apply queue unless title parts set
      if (job.ats === 'career_page' && !titleParts.length) {
        const pick = await pickResumeForJd({
          jdText: job.jdText.slice(0, 4000),
          company: job.companyName,
          role: job.title,
        })
        if (pick.gaps.length) allGaps.push(...pick.gaps)
        continue
      }
      const pick = await pickResumeForJd({
        jdText: job.jdText,
        company: job.companyName,
        role: job.title,
      })
      const item = toQueueItem(job, {
        chosenResumeId: pick.track.id,
        chosenResumePath: pick.track.filePath,
        confidence: pick.confidence,
        fitScore: pick.fitScore,
        gaps: pick.gaps,
      })
      queue.push(item)
      if (pick.gaps.length) allGaps.push(...pick.gaps)
      console.log(
        `  → ${item.status} | ${job.title} | resume=${pick.track.id} fit=${pick.fitScore}`,
      )
    }
  }

  const prev = readJson<QueueItem[]>('data/queue.json', [])
  const byId = new Map(prev.map((q) => [q.id, q]))
  for (const q of queue) byId.set(q.id, q)
  const merged = [...byId.values()]
  writeJson('data/queue.json', merged)
  if (allGaps.length) {
    const out = await appendGapsExcel(allGaps)
    console.log(`Gaps → ${out}`)
  }
  console.log(`Queue size: ${merged.length}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
