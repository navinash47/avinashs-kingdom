import fs from 'node:fs'
import path from 'node:path'
import { chromium, type BrowserContext, type Page } from 'playwright'
import { resolveFromRoot } from '../lib/paths.js'
import type { QueueItem } from '../lib/paths.js'
import { readYaml } from '../lib/paths.js'
import { waitForOtpOrLink } from '../mail/gmail-imap.js'
import { promptGmailCreds } from '../secrets/prompt.js'

export type ApplyResult = {
  status: QueueItem['status']
  error?: string
}

type Profile = {
  name: { first: string; last: string; full: string }
  email?: string
  phone?: string
  linkedin?: string
  github?: string
  canned_answers?: Record<string, string>
}

const CAPTCHA_HINTS = [
  'cf-turnstile',
  'g-recaptcha',
  'hcaptcha',
  'challenge-platform',
  'cdn-cgi/challenge',
  'Verify you are human',
  'Attention Required',
]

async function launchContext(): Promise<BrowserContext> {
  const userData = resolveFromRoot('data/browser-profile')
  fs.mkdirSync(userData, { recursive: true })
  return chromium.launchPersistentContext(userData, {
    headless: false,
    viewport: { width: 1280, height: 900 },
    acceptDownloads: true,
  })
}

async function pageLooksBlocked(page: Page): Promise<boolean> {
  const html = await page.content().catch(() => '')
  const title = (await page.title().catch(() => '')).toLowerCase()
  if (title.includes('just a moment') || title.includes('attention required')) {
    return true
  }
  return CAPTCHA_HINTS.some((h) => html.includes(h))
}

async function waitForHumanClear(page: Page, item: QueueItem): Promise<void> {
  console.log(
    `\n⏸  CAPTCHA / bot wall on ${item.companyName} — ${item.title}\n` +
      `   Browser is open. Solve it, then press Enter here to continue…`,
  )
  await new Promise<void>((resolve) => {
    process.stdin.resume()
    process.stdin.once('data', () => resolve())
  })
  await page.waitForTimeout(500)
}

async function fillCommonFields(page: Page, profile: Profile, email: string) {
  const pairs: Array<[RegExp, string]> = [
    [/first.?name/i, profile.name.first],
    [/last.?name/i, profile.name.last],
    [/^name$/i, profile.name.full],
    [/email/i, email || profile.email || ''],
    [/phone|mobile/i, profile.phone || ''],
    [/linkedin/i, profile.linkedin || ''],
    [/github/i, profile.github || ''],
  ]
  for (const [re, value] of pairs) {
    if (!value) continue
    const loc = page
      .locator(
        'input, textarea',
      )
      .filter({ has: page.locator(`xpath=ancestor-or-self::*`) })
    const inputs = page.locator('input:visible, textarea:visible')
    const count = await inputs.count()
    for (let i = 0; i < count; i++) {
      const el = inputs.nth(i)
      const name = `${await el.getAttribute('name')} ${await el.getAttribute('id')} ${await el.getAttribute('placeholder')} ${await el.getAttribute('aria-label')}`
      if (re.test(name)) {
        await el.fill(value).catch(() => undefined)
      }
    }
    void loc
  }
}

async function uploadResume(page: Page, resumePath: string) {
  if (!fs.existsSync(resumePath)) {
    throw new Error(`Resume file missing: ${resumePath}`)
  }
  // Prefer .pdf/.docx for ATS; skip .txt fixtures if a binary sibling exists
  const upload = page.locator('input[type="file"]').first()
  if ((await upload.count()) === 0) {
    console.warn('No file input found — resume upload skipped')
    return
  }
  await upload.setInputFiles(resumePath)
}

async function trySubmit(page: Page): Promise<boolean> {
  const btn = page
    .locator(
      'button:has-text("Submit"), input[type="submit"], button:has-text("Apply"), button:has-text("Send application")',
    )
    .first()
  if ((await btn.count()) === 0) return false
  await btn.click({ timeout: 5000 }).catch(() => undefined)
  await page.waitForTimeout(1500)
  return true
}

async function handleOtpIfNeeded(page: Page): Promise<void> {
  const html = await page.content()
  if (!/otp|verification code|enter the code|verify your email/i.test(html)) {
    return
  }
  console.log('OTP / verify flow detected — prompting Gmail and polling IMAP…')
  const creds = await promptGmailCreds()
  const result = await waitForOtpOrLink({
    address: creds.address,
    appPassword: creds.appPassword,
    timeoutMs: 180_000,
  })
  if (!result) {
    throw new Error('Timed out waiting for OTP / verify link in Gmail')
  }
  if (result.verifyUrl) {
    await page.goto(result.verifyUrl, { waitUntil: 'domcontentloaded' })
    return
  }
  if (result.code) {
    const otpInput = page
      .locator(
        'input[name*="otp" i], input[name*="code" i], input[autocomplete="one-time-code"], input[type="tel"]',
      )
      .first()
    if ((await otpInput.count()) > 0) {
      await otpInput.fill(result.code)
    }
  }
}

export async function applyQueueItem(item: QueueItem): Promise<ApplyResult> {
  if (!item.chosenResumePath) {
    return { status: 'failed', error: 'No resume selected' }
  }
  if (item.status === 'gap-only') {
    return { status: 'gap-only' }
  }

  const profile = readYaml<Profile>('data/profile.yaml')
  const context = await launchContext()
  const page = context.pages()[0] || (await context.newPage())

  try {
    await page.goto(item.url, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    if (await pageLooksBlocked(page)) {
      return { status: 'waiting-on-you', error: 'CAPTCHA / bot wall' }
      // caller flips status and may re-enter after human clears
    }

    // Try to open apply form
    const applyLink = page
      .locator(
        'a:has-text("Apply"), button:has-text("Apply"), a:has-text("Submit application")',
      )
      .first()
    if ((await applyLink.count()) > 0) {
      await applyLink.click().catch(() => undefined)
      await page.waitForTimeout(1000)
    }

    if (await pageLooksBlocked(page)) {
      await waitForHumanClear(page, item)
    }

    const creds = await promptGmailCreds()
    await fillCommonFields(page, profile, creds.address)

    let resumePath = item.chosenResumePath
    // Prefer non-txt when Desktop binary exists next to fixture
    if (resumePath.endsWith('.txt')) {
      const base = path.basename(resumePath, '.txt')
      void base
    }
    await uploadResume(page, resumePath)

    await handleOtpIfNeeded(page)

    if (await pageLooksBlocked(page)) {
      await waitForHumanClear(page, item)
    }

    const submitted = await trySubmit(page)
    if (!submitted) {
      console.log(
        'Could not find Submit — leaving browser open for you to finish. Press Enter when done…',
      )
      await waitForHumanClear(page, item)
    }

    return { status: 'submitted' }
  } catch (err) {
    return {
      status: 'failed',
      error: err instanceof Error ? err.message : String(err),
    }
  } finally {
    // Keep browser profile; close context so next job can relaunch cleanly
    await context.close().catch(() => undefined)
  }
}

/** Re-enter a waiting-on-you item after human cleared CAPTCHA in persistent profile */
export async function resumeAfterCaptcha(item: QueueItem): Promise<ApplyResult> {
  console.log(`Resuming ${item.companyName} — ${item.title} after CAPTCHA…`)
  return applyQueueItem({ ...item, status: 'queued' })
}
