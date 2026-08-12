import { ImapFlow } from 'imapflow'
import { promptGmailCreds, clearSessionSecrets } from '../src/secrets/prompt.js'
import { type QueueItem, readJson, writeJson } from '../src/lib/paths.js'

const SUBJECT_RE =
  /application|thank you for applying|received your application|we received|application received/i

async function main() {
  const targets = readJson<QueueItem[]>('data/apply-targets.json', [])
  const queue = readJson<QueueItem[]>('data/queue.json', [])
  const companies = [
    ...new Set(
      (targets.length ? targets : queue.filter((q) => q.status === 'submitted')).map(
        (q) => q.companyName,
      ),
    ),
  ]
  if (!companies.length) {
    console.log('No submitted/target companies to verify')
    return
  }

  if (!process.stdin.isTTY) {
    console.error(
      'verify:mail needs an interactive terminal to prompt for Gmail App Password.\n' +
        'Run locally: npm run verify:mail',
    )
    process.exit(2)
  }
  console.log('Checking Gmail for application confirmation mails…')
  const creds = await promptGmailCreds()
  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: {
      user: creds.address,
      pass: creds.appPassword.replace(/\s+/g, ''),
    },
    logger: false,
  })
  await client.connect()
  const since = new Date(Date.now() - 2 * 24 * 3600 * 1000)
  const hits: Array<{ subject: string; from: string; company?: string }> = []
  try {
    const lock = await client.getMailboxLock('INBOX')
    try {
      for await (const msg of client.fetch(
        { since },
        { envelope: true, uid: true },
      )) {
        const subject = msg.envelope?.subject || ''
        const from =
          msg.envelope?.from?.map((a) => `${a.name || ''} <${a.address || ''}>`).join(', ') ||
          ''
        if (!SUBJECT_RE.test(subject)) continue
        const company = companies.find((c) =>
          `${subject} ${from}`.toLowerCase().includes(c.toLowerCase()),
        )
        hits.push({ subject, from, company })
      }
    } finally {
      lock.release()
    }
  } finally {
    await client.logout().catch(() => undefined)
    clearSessionSecrets()
  }

  console.log(`Found ${hits.length} confirmation-like messages`)
  for (const h of hits) {
    console.log(`  • [${h.company || '?'}] ${h.subject} — ${h.from}`)
  }

  const next = queue.map((q) => {
    if (q.status !== 'submitted') return q
    const seen = hits.some(
      (h) =>
        h.company?.toLowerCase() === q.companyName.toLowerCase() ||
        h.subject.toLowerCase().includes(q.companyName.toLowerCase()),
    )
    return { ...q, confirmationEmailSeen: seen }
  })
  writeJson('data/queue.json', next)
}

main().catch((err) => {
  clearSessionSecrets()
  console.error(err)
  process.exit(1)
})
