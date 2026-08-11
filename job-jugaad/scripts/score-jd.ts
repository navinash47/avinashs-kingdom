import fs from 'node:fs'
import { pickResumeForJd } from '../src/score/pick-resume.js'
import { writeGapsExcel } from '../src/export/gaps-xlsx.js'
import { buildResumeIndex } from '../src/score/index-resumes.js'

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name)
  return i >= 0 ? process.argv[i + 1] : undefined
}

const demoJd = `
We are hiring a GenAI / LLM Engineer to build RAG pipelines, agent workflows,
and evaluation harnesses using LangChain, OpenAI, and Anthropic. Experience with
multimodal models and production prompt systems required. Nice to have: Kubernetes.
`

async function main() {
  buildResumeIndex()
  const file = arg('--file')
  const company = arg('--company') || 'DemoCo'
  const role = arg('--role') || 'GenAI Engineer'
  const jdText =
    file && fs.existsSync(file)
      ? fs.readFileSync(file, 'utf8')
      : process.argv.includes('--demo')
        ? demoJd
        : (() => {
            throw new Error('Pass --file <jd.txt> or --demo')
          })()

  const pick = await pickResumeForJd({ jdText, company, role })
  console.log(
    `Chosen resume: ${pick.track.id} (${pick.track.label}) confidence=${pick.confidence.toFixed(2)} fit=${pick.fitScore}`,
  )
  console.log(`File (as-is): ${pick.track.filePath}`)
  console.log(`Reason: ${pick.reason}`)
  if (pick.gaps.length) {
    const out = await writeGapsExcel(pick.gaps)
    console.log(`Wrote ${pick.gaps.length} gaps → ${out}`)
    for (const g of pick.gaps) console.log(`  • ${g.gap}: ${g.learnNext}`)
  } else {
    console.log('No skill gaps detected')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
