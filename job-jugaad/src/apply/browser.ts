import fs from 'node:fs'
import path from 'node:path'
import { chromium, type BrowserContext, type Frame, type Page } from 'playwright'
import { resolveFromRoot } from '../lib/paths.js'
import type { QueueItem } from '../lib/paths.js'
import { waitForOtpOrLink } from '../mail/gmail-imap.js'
import { promptGmailCreds } from '../secrets/prompt.js'
import {
  loadProfile,
  type ProfileData,
} from '../profile/enrich.js'
import { answerFromProfile, learnQa } from '../profile/qa-memory.js'
import { isOmniReachable, omniChat } from '../omni/client.js'

export type ApplyResult = {
  status: QueueItem['status']
  error?: string
  learnedQuestions?: string[]
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
  // Prefer headed; fall back to headless only if DISPLAY missing (cloud CI)
  const headed =
    process.env.JOB_JUGAAD_FORCE_HEADED === '1' ||
    Boolean(process.env.DISPLAY) ||
    process.platform === 'darwin'
  return chromium.launchPersistentContext(userData, {
    headless: !headed,
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
  const continueFile = '/tmp/job-jugaad-apply-continue'
  fs.rmSync(continueFile, { force: true })
  const timeoutMs = Number(process.env.JOB_JUGAAD_HUMAN_WAIT_MS || 600_000)
  console.log(
    `\n⏸  CAPTCHA / bot wall / manual step on ${item.companyName} — ${item.title}\n` +
      `   Solve it in the headed Chrome window (Cursor cloud desktop).\n` +
      `   Optional: touch ${continueFile} or press Enter (TTY) when done.\n` +
      `   Waiting up to ${Math.round(timeoutMs / 1000)}s…\n`,
  )

  if (process.stdin.isTTY) {
    await Promise.race([
      new Promise<void>((resolve) => {
        process.stdin.resume()
        process.stdin.once('data', () => resolve())
      }),
      pollUntilClear(page, continueFile, timeoutMs),
    ])
    await page.waitForTimeout(500)
    return
  }

  // Cloud / no TTY: still wait — user can click in DISPLAY desktop
  await pollUntilClear(page, continueFile, timeoutMs)
  await page.waitForTimeout(500)
}

async function pollUntilClear(
  page: Page,
  continueFile: string,
  timeoutMs: number,
): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (fs.existsSync(continueFile)) {
      fs.unlinkSync(continueFile)
      return
    }
    if (!(await pageLooksBlocked(page))) return
    await page.waitForTimeout(2500)
  }
}

function fieldLabel(name: string): string {
  return name.toLowerCase()
}

async function formRoots(page: Page): Promise<Array<Page | Frame>> {
  const roots: Array<Page | Frame> = [page, ...page.frames()]
  return roots
}

async function findRootWithSelector(
  page: Page,
  selector: string,
): Promise<Page | Frame> {
  for (const root of await formRoots(page)) {
    const n = await root.locator(selector).count().catch(() => 0)
    if (n > 0) return root
  }
  return page
}

async function fillByPatterns(
  root: Page | Frame,
  pairs: Array<[RegExp, string]>,
): Promise<void> {
  const inputs = root.locator(
    'input:visible, textarea:visible, select:visible',
  )
  const count = Math.min(await inputs.count(), 40)
  for (let i = 0; i < count; i++) {
    const el = inputs.nth(i)
    try {
      const meta = `${await el.getAttribute('name', { timeout: 800 })} ${await el.getAttribute('id', { timeout: 800 })} ${await el.getAttribute('placeholder', { timeout: 800 })} ${await el.getAttribute('aria-label', { timeout: 800 })} ${await el.getAttribute('autocomplete', { timeout: 800 })}`
      const tag = await el.evaluate((n) => n.tagName.toLowerCase())
      for (const [re, value] of pairs) {
        if (!value || !re.test(meta)) continue
        if (tag === 'select') {
          await el.selectOption({ label: value }).catch(async () => {
            await el.selectOption({ value }).catch(() => undefined)
          })
        } else {
          await el.fill(value, { timeout: 1500 }).catch(() => undefined)
        }
      }
    } catch {
      /* stale/hidden node — skip */
    }
  }
}

async function clickYesNo(
  root: Page | Frame,
  questionRe: RegExp,
  wantYes: boolean,
): Promise<boolean> {
  const labels = root.locator('label, legend, span, p, div')
  const n = Math.min(await labels.count(), 200)
  for (let i = 0; i < n; i++) {
    const t = ((await labels.nth(i).innerText().catch(() => '')) || '').trim()
    if (!questionRe.test(t) || t.length > 220) continue
    const container = labels
      .nth(i)
      .locator('xpath=ancestor::*[self::fieldset or self::div][1]')
    const choice = wantYes
      ? container.getByText(/^(yes|y)$/i).first()
      : container.getByText(/^(no|n)$/i).first()
    if ((await choice.count()) > 0) {
      await choice.click().catch(() => undefined)
      return true
    }
  }
  return false
}

async function fillCommonFields(
  page: Page,
  profile: ProfileData,
  email: string,
): Promise<void> {
  const root = await findRootWithSelector(
    page,
    'input:visible, textarea:visible, select:visible',
  )
  await fillByPatterns(root, [
    [/first.?name/i, profile.name.first],
    [/last.?name/i, profile.name.last],
    [/^name$|full.?name/i, profile.name.full],
    [/e-?mail/i, email || profile.email || ''],
    [/phone|mobile|tel/i, profile.phone || ''],
    [/linkedin/i, profile.linkedin || ''],
    [/github/i, profile.github || ''],
    [/website|portfolio|personal.?site/i, profile.website || ''],
    [/city|location|reside/i, profile.location || ''],
    [/visa|immigration|work.?auth/i, profile.work_authorization || 'F-1 OPT'],
  ])

  await clickYesNo(
    root,
    /legally authorized to work|authorized to work in the (united states|us)/i,
    true,
  )
  await clickYesNo(
    root,
    /require.*sponsorship|need.*sponsor|future.*work authorization|will you now or in the future/i,
    true,
  )
}

async function resolveUploadPath(resumePath: string): Promise<string> {
  if (!resumePath.endsWith('.txt')) return resumePath
  // ATS usually rejects .txt — wrap fixture text into a minimal PDF for cloud/dev only
  const out = resumePath.replace(/\.txt$/i, '.upload.pdf')
  const text = fs.readFileSync(resumePath, 'utf8').replace(/[()\\]/g, ' ')
  const content = `BT /F1 11 Tf 50 750 Td (${text.slice(0, 1800)}) Tj ET`
  const objects = [
    '1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n',
    '2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n',
    '3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj\n',
    `4 0 obj<< /Length ${content.length} >>stream\n${content}\nendstream\nendobj\n`,
    '5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n',
  ]
  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'))
    pdf += obj
  }
  const xref = Buffer.byteLength(pdf, 'utf8')
  pdf += `xref\n0 ${objects.length + 1}\n`
  pdf += '0000000000 65535 f \n'
  for (let i = 1; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
  }
  pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  fs.writeFileSync(out, pdf)
  return out
}

async function uploadResume(page: Page, resumePath: string) {
  if (!fs.existsSync(resumePath)) {
    throw new Error(`Resume file missing: ${resumePath}`)
  }
  const root = await findRootWithSelector(page, 'input[type="file"]')
  const upload = root.locator('input[type="file"]').first()
  if ((await upload.count()) === 0) {
    console.warn('No file input found — resume upload skipped')
    return
  }
  await upload.setInputFiles(resumePath)
}

async function trySubmit(page: Page): Promise<boolean> {
  const root = await findRootWithSelector(
    page,
    'button:has-text("Submit"), input[type="submit"], button:has-text("Submit application"), button:has-text("Send application")',
  )
  const btn = root
    .locator(
      'button:has-text("Submit"), input[type="submit"], button:has-text("Submit application"), button:has-text("Send application")',
    )
    .first()
  if ((await btn.count()) === 0) return false
  await btn.click({ timeout: 5000 }).catch(() => undefined)
  await page.waitForTimeout(1500)
  return true
}

async function handleOtpIfNeeded(page: Page, item: QueueItem): Promise<void> {
  const html = await page.content()
  if (!/otp|verification code|enter the code|verify your email/i.test(html)) {
    return
  }
  const envAddr = process.env.JOB_JUGAAD_GMAIL_USER?.trim()
  const envPass = process.env.JOB_JUGAAD_GMAIL_APP_PASSWORD?.trim()
  if (envAddr && envPass) {
    console.log('OTP / verify flow detected — polling Gmail IMAP (env creds)…')
    const result = await waitForOtpOrLink({
      address: envAddr,
      appPassword: envPass,
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
    return
  }

  if (process.stdin.isTTY) {
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
    return
  }

  console.log(
    'OTP / email verify detected — complete it in the headed browser (no Gmail secrets in this process).',
  )
  await waitForHumanClear(page, item)
}

async function draftAnswer(
  question: string,
  profile: ProfileData,
): Promise<string> {
  const known = answerFromProfile(question, profile)
  if (known) return known
  if (!(await isOmniReachable())) {
    if (/sponsor|visa|opt|authoriz/i.test(question)) {
      return (
        profile.canned_answers?.work_auth_detail ||
        'Currently on F-1 OPT; will require future work authorization / sponsorship.'
      )
    }
    return profile.canned_answers?.why_company || 'See resume.'
  }
  const ans = await omniChat(
    [
      {
        role: 'system',
        content:
          'Answer ATS application questions briefly in first person. Work auth: F-1 OPT, legally authorized yes, needs future sponsorship yes. Do not invent phone numbers.',
      },
      {
        role: 'user',
        content: `Profile JSON (no secrets): ${JSON.stringify({
          name: profile.name,
          location: profile.location,
          headline: profile.headline,
          about: profile.about,
          linkedin: profile.linkedin,
          github: profile.github,
          work_authorization: profile.work_authorization,
          sponsorship_needed: profile.sponsorship_needed,
          learned_answers: profile.learned_answers,
        }).slice(0, 3500)}\n\nQuestion: ${question}`,
      },
    ],
    { temperature: 0.2 },
  )
  return ans.slice(0, 800) || 'See resume.'
}

async function fillCustomQuestions(
  page: Page,
  profile: ProfileData,
  item: QueueItem,
): Promise<string[]> {
  const learned: string[] = []
  const root = await findRootWithSelector(page, 'textarea:visible')
  const textareas = root.locator('textarea:visible')
  const n = await textareas.count()
  for (let i = 0; i < n; i++) {
    const el = textareas.nth(i)
    const current = await el.inputValue().catch(() => '')
    if (current && current.trim()) continue
    const meta = `${await el.getAttribute('name')} ${await el.getAttribute('aria-label')} ${await el.getAttribute('placeholder')}`
    const nearby = await el
      .evaluate((node) => {
        const label = node.closest('label')?.innerText
        const prev = (node as HTMLElement).previousElementSibling?.textContent
        const parent = node.parentElement?.innerText
        return `${label || ''} ${prev || ''} ${(parent || '').slice(0, 240)}`
      })
      .catch(() => meta)
    const question = `${nearby} ${meta}`.replace(/\s+/g, ' ').trim()
    if (question.length < 8) continue
    const answer = await draftAnswer(question, profile)
    await el.fill(answer).catch(() => undefined)
    learnQa(question, answer, {
      company: item.companyName,
      role: item.title,
    })
    learned.push(question.slice(0, 120))
  }
  return learned
}

export async function applyQueueItem(item: QueueItem): Promise<ApplyResult> {
  if (!item.chosenResumePath) {
    return { status: 'failed', error: 'No resume selected' }
  }
  if (item.status === 'gap-only') {
    return { status: 'gap-only' }
  }

  let profile = loadProfile()
  const context = await launchContext()
  const page = context.pages()[0] || (await context.newPage())
  const learnedQuestions: string[] = []

  try {
    await page.goto(item.url, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    if (await pageLooksBlocked(page)) {
      await waitForHumanClear(page, item)
      if (await pageLooksBlocked(page)) {
        return { status: 'waiting-on-you', error: 'CAPTCHA / bot wall' }
      }
    }

    // Prefer direct application URL when greenhouse job page has #app / apply path
    if (!/\/application|\/apply/i.test(page.url())) {
      const applyLink = page
        .locator(
          'a:has-text("Apply"), button:has-text("Apply"), a:has-text("Submit application"), a[href*="apply"], a[href*="application"]',
        )
        .first()
      if ((await applyLink.count()) > 0) {
        await Promise.all([
          page.waitForLoadState('domcontentloaded').catch(() => undefined),
          applyLink.click().catch(() => undefined),
        ])
        await page.waitForTimeout(1500)
      }
      if (/boards\.greenhouse\.io|job-boards\.greenhouse\.io/i.test(page.url())) {
        const base = page.url().split('?')[0].replace(/\/$/, '')
        if (!/\/application$/i.test(base)) {
          await page
            .goto(`${base}/application`, { waitUntil: 'domcontentloaded' })
            .catch(() => undefined)
          await page.waitForTimeout(1200)
        }
      }
    }

    // Wait briefly for file input to appear (forms hydrate)
    await page
      .locator('input[type="file"]')
      .first()
      .waitFor({ state: 'attached', timeout: 8000 })
      .catch(() => undefined)

    if (await pageLooksBlocked(page)) {
      await waitForHumanClear(page, item)
      if (await pageLooksBlocked(page)) {
        return { status: 'waiting-on-you', error: 'CAPTCHA / bot wall after Apply' }
      }
    }

    const credsEmail = profile.email || ''
    if (!credsEmail) {
      const creds = await promptGmailCreds()
      await fillCommonFields(page, profile, creds.address)
    } else {
      await fillCommonFields(page, profile, credsEmail)
    }
    await uploadResume(page, await resolveUploadPath(item.chosenResumePath))
    const learned = await fillCustomQuestions(page, profile, item)
    learnedQuestions.push(...learned)
    profile = loadProfile()

    await handleOtpIfNeeded(page, item)

    if (await pageLooksBlocked(page)) {
      await waitForHumanClear(page, item)
    }

    const submitted = await trySubmit(page)
    if (!submitted) {
      console.log(
        'Could not find Submit — leaving browser open for you to finish…',
      )
      await waitForHumanClear(page, item)
      // If user finished manually, count as submitted when URL/thanks hints appear
      const html = (await page.content().catch(() => '')).toLowerCase()
      const thanks =
        /thank you|application (has been )?submitted|we received your application/i.test(
          html,
        )
      if (!thanks) {
        return {
          status: 'waiting-on-you',
          error: 'Submit not found / needs manual finish',
          learnedQuestions,
        }
      }
    }

    return { status: 'submitted', learnedQuestions }
  } catch (err) {
    return {
      status: 'failed',
      error: err instanceof Error ? err.message : String(err),
      learnedQuestions,
    }
  } finally {
    await context.close().catch(() => undefined)
  }
}

export async function resumeAfterCaptcha(item: QueueItem): Promise<ApplyResult> {
  console.log(`Resuming ${item.companyName} — ${item.title} after CAPTCHA…`)
  return applyQueueItem({ ...item, status: 'queued' })
}

void path
void fieldLabel
