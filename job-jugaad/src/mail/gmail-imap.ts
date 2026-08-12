import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'

export type OtpResult = {
  code?: string
  verifyUrl?: string
  subject?: string
  from?: string
}

const CODE_RE = /\b(\d{4,8})\b/
const URL_RE = /https?:\/\/[^\s<>"']+/gi

export async function waitForOtpOrLink(opts: {
  address: string
  appPassword: string
  afterMs?: number
  timeoutMs?: number
  fromIncludes?: string
  subjectIncludes?: string
}): Promise<OtpResult | null> {
  const after = opts.afterMs ?? Date.now() - 60_000
  const deadline = Date.now() + (opts.timeoutMs ?? 120_000)
  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: {
      user: opts.address,
      pass: opts.appPassword.replace(/\s+/g, ''),
    },
    logger: false,
  })

  await client.connect()
  try {
    while (Date.now() < deadline) {
      const lock = await client.getMailboxLock('INBOX')
      try {
        const since = new Date(after)
        for await (const msg of client.fetch(
          { seen: false, since },
          { envelope: true, source: true, uid: true },
        )) {
          const from =
            msg.envelope?.from?.map((a) => a.address || '').join(',') || ''
          const subject = msg.envelope?.subject || ''
          if (
            opts.fromIncludes &&
            !from.toLowerCase().includes(opts.fromIncludes.toLowerCase())
          ) {
            continue
          }
          if (
            opts.subjectIncludes &&
            !subject.toLowerCase().includes(opts.subjectIncludes.toLowerCase())
          ) {
            continue
          }
          const parsed = await simpleParser(msg.source!)
          const body = `${parsed.text || ''}\n${parsed.html || ''}`
          const codeMatch = body.match(CODE_RE)
          const urls = body.match(URL_RE) || []
          const verifyUrl = urls.find(
            (u) =>
              /verify|confirm|activate|token|otp/i.test(u) ||
              /accounts\.google|greenhouse|lever|ashby/i.test(u),
          )
          if (codeMatch || verifyUrl) {
            return {
              code: codeMatch?.[1],
              verifyUrl,
              subject,
              from,
            }
          }
        }
      } finally {
        lock.release()
      }
      await new Promise((r) => setTimeout(r, 5000))
    }
  } finally {
    await client.logout().catch(() => undefined)
  }
  return null
}
