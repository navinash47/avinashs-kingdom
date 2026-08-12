import { buildResumeIndex } from '../src/score/index-resumes.js'

const index = buildResumeIndex()
console.log(
  `Indexed ${index.tracks.length} resume tracks → data/resume-index.json`,
)
for (const t of index.tracks) {
  console.log(`  - ${t.id}: ${t.filePath}`)
}
