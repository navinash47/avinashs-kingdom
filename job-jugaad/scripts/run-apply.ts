import {
  type QueueItem,
  readJson,
  writeJson,
} from '../src/lib/paths.js'
import { applyQueueItem, resumeAfterCaptcha } from '../src/apply/browser.js'
import { appendGapsExcel } from '../src/export/gaps-xlsx.js'
import { promptGmailCreds } from '../src/secrets/prompt.js'
import { clearSessionSecrets } from '../src/secrets/prompt.js'

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name)
  return i >= 0 ? process.argv[i + 1] : undefined
}

async function main() {
  const limit = Number(arg('--limit') || '3')
  const queue = readJson<QueueItem[]>('data/queue.json', [])
  if (!queue.length) {
    console.error('Queue empty — run npm run discover first')
    process.exit(1)
  }

  console.log(
    'Job Jugaad apply — Gmail credentials are prompted (memory-only, not saved).',
  )
  await promptGmailCreds()

  const targets = queue
    .filter((q) => q.status === 'queued' || q.status === 'waiting-on-you')
    .slice(0, limit)

  if (!targets.length) {
    console.log('No queued / waiting-on-you items')
    return
  }

  for (const item of targets) {
    console.log(`\n=== ${item.companyName} — ${item.title} ===`)
    const wasWaiting = item.status === 'waiting-on-you'
    item.status = 'filling'
    item.updatedAt = new Date().toISOString()
    writeJson('data/queue.json', queue)

    const result = wasWaiting
      ? await resumeAfterCaptcha(item)
      : await applyQueueItem(item)

    // Fix: we already set filling; use result
    const idx = queue.findIndex((q) => q.id === item.id)
    if (idx >= 0) {
      queue[idx] = {
        ...queue[idx],
        status: result.status,
        error: result.error,
        updatedAt: new Date().toISOString(),
      }
      if (result.status === 'failed' || result.status === 'gap-only') {
        if (queue[idx].gaps.length) {
          await appendGapsExcel(queue[idx].gaps)
        } else if (result.error) {
          await appendGapsExcel([
            {
              company: item.companyName,
              role: item.title,
              chosenResume: item.chosenResumeId || '',
              gap: 'apply-failure',
              why: result.error,
              learnNext: 'Inspect failure; fix profile facts or try again after CAPTCHA',
            },
          ])
        }
      }
      writeJson('data/queue.json', queue)
    }
    console.log(`Result: ${result.status}${result.error ? ` — ${result.error}` : ''}`)
  }

  clearSessionSecrets()
  console.log('Done. Session secrets cleared from memory.')
}

main().catch((err) => {
  clearSessionSecrets()
  console.error(err)
  process.exit(1)
})
