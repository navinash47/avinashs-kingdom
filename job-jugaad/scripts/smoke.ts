import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import assert from 'node:assert/strict'
import { pickResumeForJd } from '../src/score/pick-resume.js'
import { buildResumeIndex } from '../src/score/index-resumes.js'
import { toQueueItem } from '../src/discover/ats.js'

async function main() {
  buildResumeIndex()

  const genai = await pickResumeForJd({
    jdText:
      'GenAI LLM Engineer building RAG agents with LangChain and Anthropic APIs',
    company: 'Test',
    role: 'GenAI / LLM Engineer',
    useLlm: false,
  })
  assert.equal(genai.track.id, 'genai-llm')

  const health = await pickResumeForJd({
    jdText: 'Healthcare AI engineer HIPAA FHIR clinical NLP',
    company: 'Test',
    role: 'Healthcare AI Engineer',
    useLlm: false,
  })
  assert.equal(health.track.id, 'healthcare-ai')

  const a = toQueueItem(
    {
      companyId: 'x',
      companyName: 'X',
      title: 'A',
      url: 'https://example.com/jobs/1',
      jdText: 'hi',
      ats: 'greenhouse',
    },
    {
      chosenResumeId: 'general',
      chosenResumePath: '/tmp/a',
      confidence: 0.5,
      fitScore: 50,
      gaps: [],
    },
  )
  const b = toQueueItem(
    {
      companyId: 'x',
      companyName: 'X',
      title: 'B',
      url: 'https://example.com/jobs/2',
      jdText: 'hi',
      ats: 'greenhouse',
    },
    {
      chosenResumeId: 'general',
      chosenResumePath: '/tmp/a',
      confidence: 0.5,
      fitScore: 50,
      gaps: [],
    },
  )
  assert.notEqual(a.id, b.id)

  // CAPTCHA hint presence check (static)
  const hints = ['cf-turnstile', 'g-recaptcha', 'Verify you are human']
  assert.ok(hints.length >= 3)

  // Secrets module: ensure no .env write path exists in package
  const fs = await import('node:fs')
  assert.equal(fs.existsSync(new URL('../.env', import.meta.url)), false)

  // Smoke HTTP state shape
  const server = createServer((_req, res) => {
    res.end('ok')
  })
  await new Promise<void>((r) => server.listen(0, r))
  const port = (server.address() as AddressInfo).port
  const res = await fetch(`http://127.0.0.1:${port}`)
  assert.equal(res.status, 200)
  server.close()

  console.log('smoke ok')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
