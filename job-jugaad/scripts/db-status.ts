import { jobStats, listCompanies, listJobs, getDb } from '../src/db/client.js'

getDb()
const stats = jobStats()
const companies = listCompanies()
const top = listJobs({ status: 'queued', minFit: 55, limit: 15 })
console.log('Companies:', companies.length)
console.log('Job status:', stats)
console.log('\nTop queued:')
for (const j of top) {
  console.log(
    `  ${j.fit_score} ${j.resume_track} [${j.source}] ${j.company_id} — ${j.title}`,
  )
}
