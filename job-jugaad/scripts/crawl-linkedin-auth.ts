/**
 * LinkedIn login (memory-only creds) + job listing harvest.
 * Creds via process env for this run only — never write to .env/git/brain:
 *   JOB_JUGAAD_LI_USER  JOB_JUGAAD_LI_PASS  [JOB_JUGAAD_LI_OTP]
 * OTP file fallback: /tmp/job-jugaad-linkedin-otp (single line), deleted after read.
 * No Easy Apply in this script — listings → SQLite; ATS apply via auto:apply.
 */
import fs from 'node:fs'
import { chromium, type Page } from 'playwright'
import { loadCrawlConfig, ingestDiscovered } from '../src/crawl/pipeline.js'
import type { DiscoveredJob } from '../src/discover/ats.js'
import { buildResumeIndex } from '../src/score/index-resumes.js'
import { resolveFromRoot } from '../src/lib/paths.js'

const OTP_FILE = '/tmp/job-jugaad-linkedin-otp'
const CONTINUE_FILE = '/tmp/job-jugaad-linkedin-continue'
const STATUS_FILE = '/tmp/job-jugaad-linkedin-status.json'

const JOB_URL_RE =
  /(?:https?:\/\/(?:www\.)?linkedin\.com)?\/jobs\/view\/(\d+)/gi
const EXT_ATS_RE =
  /https?:\/\/(?:(?:job-)?boards\.greenhouse\.io\/[^/\s"'<>]+\/jobs\/\d+[^\s"'<>]*|jobs\.lever\.co\/[^/\s"'<>]+\/[a-f0-9-]+[^\s"'<>]*|jobs\.ashbyhq\.com\/[^/\s"'<>]+\/[a-f0-9-]+[^\s"'<>]*)/gi

function writeStatus(s: Record<string, unknown>) {
  fs.writeFileSync(STATUS_FILE, JSON.stringify({ ...s, at: new Date().toISOString() }, null, 2))
}

async function readOtp(timeoutMs = 900_000): Promise<string | null> {
  const fromEnv = process.env.JOB_JUGAAD_LI_OTP?.trim()
  if (fromEnv) return fromEnv
  const start = Date.now()
  console.log(
    `\n⏸  LinkedIn wants OTP/2FA.\n` +
      `   Reply in chat with the code, or: echo CODE > ${OTP_FILE}\n` +
      `   Waiting up to ${Math.round(timeoutMs / 1000)}s…\n`,
  )
  writeStatus({ state: 'waiting_otp', otpFile: OTP_FILE })
  while (Date.now() - start < timeoutMs) {
    if (fs.existsSync(OTP_FILE)) {
      const code = fs.readFileSync(OTP_FILE, 'utf8').trim()
      fs.unlinkSync(OTP_FILE)
      if (code) return code
    }
    const envNow = process.env.JOB_JUGAAD_LI_OTP?.trim()
    if (envNow) return envNow
    await new Promise((r) => setTimeout(r, 2000))
  }
  return null
}

/** Pause for human CAPTCHA / "I'm not a robot" clicks in Cursor cloud desktop. */
async function waitForHumanChallenge(
  page: Page,
  reason: string,
  timeoutMs = 900_000,
): Promise<void> {
  const start = Date.now()
  fs.rmSync(CONTINUE_FILE, { force: true })
  const shot = resolveFromRoot('data/linkedin-waiting-on-you.png')
  await page.screenshot({ path: shot, fullPage: true }).catch(() => undefined)
  console.log(
    `\n⏸  ${reason}\n` +
      `   Click through in the headed Chrome window (Cursor cloud desktop).\n` +
      `   Optional: touch ${CONTINUE_FILE} when done.\n` +
      `   Waiting up to ${Math.round(timeoutMs / 1000)}s…\n`,
  )
  writeStatus({
    state: 'waiting_on_you',
    reason,
    continueFile: CONTINUE_FILE,
    screenshot: shot,
    url: page.url(),
  })

  while (Date.now() - start < timeoutMs) {
    if (fs.existsSync(CONTINUE_FILE)) {
      fs.unlinkSync(CONTINUE_FILE)
      writeStatus({ state: 'human_continue', url: page.url() })
      return
    }
    const url = page.url()
    const loggedIn =
      /linkedin\.com\/(feed|jobs|in\/|mynetwork)/i.test(url) ||
      ((await page.locator('input[placeholder*="Search"]').count()) > 0 &&
        !/\/login|checkpoint|challenge|captcha/i.test(url))
    if (loggedIn) {
      writeStatus({ state: 'human_cleared', url })
      return
    }
    // Still on captcha / challenge — keep waiting
    const blocked = await pageLooksLikeCaptcha(page)
    if (!blocked && !/login|checkpoint|challenge|captcha/i.test(url)) {
      writeStatus({ state: 'human_cleared', url })
      return
    }
    await page.waitForTimeout(2500)
  }
  throw new Error(`Timed out waiting for human challenge: ${reason}`)
}

async function pageLooksLikeCaptcha(page: Page): Promise<boolean> {
  const url = page.url()
  const html = (await page.content().catch(() => '')).toLowerCase()
  if (/captcha|challenge|security.?check|not a robot|arkose|funcaptcha|recaptcha/i.test(url + html)) {
    return true
  }
  const frames = page.frames()
  for (const f of frames) {
    const fu = f.url()
    if (/captcha|recaptcha|hcaptcha|arkoselabs|funcaptcha/i.test(fu)) return true
  }
  return (
    (await page
      .locator(
        'iframe[src*="captcha"], iframe[src*="recaptcha"], iframe[title*="not a robot" i], #captcha-internal, .captcha',
      )
      .count()) > 0
  )
}

async function maybeHandleCheckpoint(page: Page): Promise<boolean> {
  const url = page.url()
  const html = await page.content().catch(() => '')
  const needs =
    /checkpoint|challenge|two-step|2.?step|verification|pin\/verify|challenge-type/i.test(
      url + html,
    ) ||
    (await page
      .locator(
        'input#input__phone_verification_pin, input[name="pin"], input[name="verificationCode"], input#email-pin-input, input[autocomplete="one-time-code"], input[inputmode="numeric"]',
      )
      .count()) > 0
  if (!needs) return false

  const otp = await readOtp()
  if (!otp) {
    writeStatus({ state: 'otp_timeout' })
    throw new Error('LinkedIn OTP timed out — send the code and re-run')
  }
  const pin = page
    .locator(
      'input#input__phone_verification_pin, input[name="pin"], input[name="verificationCode"], input#email-pin-input, input[autocomplete="one-time-code"], input[inputmode="numeric"], input[id*="verification" i], input[aria-label*="code" i]',
    )
    .first()
  await pin.waitFor({ state: 'visible', timeout: 15000 })
  await pin.fill(otp)
  const submit = page
    .locator(
      'button[type="submit"], button:has-text("Submit"), button:has-text("Continue"), button:has-text("Verify"), button:has-text("Next")',
    )
    .first()
  await submit.click().catch(() => undefined)
  await page.waitForTimeout(3000)
  writeStatus({ state: 'otp_submitted' })
  return true
}

async function dismissNoise(page: Page) {
  for (const sel of [
    'button:has-text("Accept")',
    'button:has-text("Accept all")',
    'button:has-text("Reject")',
    'button[action-type="ACCEPT"]',
    'button.artdeco-global-alert-action',
  ]) {
    const b = page.locator(sel).first()
    if ((await b.count()) > 0) {
      await b.click({ timeout: 2000 }).catch(() => undefined)
      await page.waitForTimeout(500)
    }
  }
}

async function loginLinkedIn(page: Page, user: string, pass: string) {
  writeStatus({ state: 'login_start', user })
  await page.goto('https://www.linkedin.com/login', {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  })
  await page.waitForTimeout(2000)
  await dismissNoise(page)

  // Already logged in?
  if (
    /\/feed|\/jobs|\/in\//i.test(page.url()) &&
    !/login|checkpoint|uas\/login/i.test(page.url())
  ) {
    writeStatus({ state: 'already_logged_in' })
    return
  }

  // LinkedIn sometimes serves authwall / signup — force login form
  if (!(await page.locator('#username, input[name="session_key"]').count())) {
    await page.goto(
      'https://www.linkedin.com/uas/login?fromSignIn=true&trk=guest_homepage-basic_nav-header-signin',
      { waitUntil: 'domcontentloaded', timeout: 60_000 },
    )
    await page.waitForTimeout(2000)
    await dismissNoise(page)
  }

  const userBox = page.locator('input[type="email"]:visible, input[autocomplete="username webauthn"]:visible').first()
  const passBox = page.locator('input[type="password"]:visible').first()
  try {
    await userBox.waitFor({ state: 'visible', timeout: 20000 })
  } catch {
    const shot = resolveFromRoot('data/linkedin-login-state.png')
    await page.screenshot({ path: shot, fullPage: true }).catch(() => undefined)
    writeStatus({
      state: 'login_form_missing',
      url: page.url(),
      screenshot: shot,
      title: await page.title().catch(() => ''),
    })
    throw new Error(`LinkedIn login form not found — url=${page.url()}`)
  }

  await userBox.click()
  await userBox.fill(user)
  await passBox.click()
  await passBox.fill(pass)
  await page.getByRole('button', { name: /^sign in$/i }).click()
  await page.waitForTimeout(5000)

  if (await pageLooksLikeCaptcha(page)) {
    await waitForHumanChallenge(page, 'LinkedIn CAPTCHA / “I’m not a robot” — click in cloud desktop')
  }

  await maybeHandleCheckpoint(page)

  if (/checkpoint|challenge|login/i.test(page.url())) {
    await maybeHandleCheckpoint(page)
  }

  if (await pageLooksLikeCaptcha(page) || /checkpoint|challenge|captcha/i.test(page.url())) {
    await waitForHumanChallenge(
      page,
      'Still on LinkedIn challenge — finish CAPTCHA/OTP in the browser',
    )
  }

  // Feed may use different host paths after login
  const ok =
    /linkedin\.com\/(feed|jobs|in\/|mynetwork)/i.test(page.url()) ||
    ((await page.locator('input[placeholder*="Search"]').count()) > 0 &&
      !/\/login/i.test(page.url()))

  if (!ok && /login|checkpoint|challenge|captcha/i.test(page.url())) {
    const shot = resolveFromRoot('data/linkedin-login-state.png')
    await page.screenshot({ path: shot, fullPage: true }).catch(() => undefined)
    writeStatus({ state: 'login_blocked', url: page.url(), screenshot: shot })
    throw new Error(`LinkedIn login not complete — url=${page.url()} (OTP/CAPTCHA may be required)`)
  }
  writeStatus({ state: 'login_ok', url: page.url() })
}

function companyFromLinkedInHtml(cardHtml: string): string {
  const m =
    cardHtml.match(/job-card-container__primary-description[^>]*>([^<]+)/i) ||
    cardHtml.match(/artdeco-entity-lockup__subtitle[^>]*>([^<]+)/i)
  return (m?.[1] || 'LinkedIn').replace(/\s+/g, ' ').trim().slice(0, 80)
}

async function harvestSearch(page: Page, url: string): Promise<DiscoveredJob[]> {
  const out: DiscoveredJob[] = []
  console.log('Open', url)
  writeStatus({ state: 'harvest', url })
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await page.waitForTimeout(2500)

  // Dismiss common overlays quickly
  for (const sel of [
    'button:has-text("Dismiss")',
    'button:has-text("Not now")',
    'button[aria-label="Dismiss"]',
  ]) {
    await page.locator(sel).first().click({ timeout: 800 }).catch(() => undefined)
  }

  for (let i = 0; i < 10; i++) {
    await page.mouse.wheel(0, 2200)
    await page.waitForTimeout(450)
  }

  const html = await page.content()
  const ids = [...new Set([...html.matchAll(JOB_URL_RE)].map((m) => m[1]))]
  console.log(`  job ids from html=${ids.length}`)

  // Fast path: build listings from IDs (avoid per-card locator hangs)
  for (const id of ids.slice(0, 50)) {
    out.push({
      companyId: 'linkedin',
      companyName: 'LinkedIn',
      title: 'LinkedIn role',
      url: `https://www.linkedin.com/jobs/view/${id}`,
      jdText: 'LinkedIn listing (US full-time search)',
      location: 'United States',
      ats: 'linkedin',
    })
  }

  // Also capture any external ATS links visible on the page
  for (const u of html.match(EXT_ATS_RE) || []) {
    out.push({
      companyId: 'linkedin',
      companyName: 'LinkedIn',
      title: 'ATS via LinkedIn',
      url: u.split('?')[0],
      jdText: 'External apply link from LinkedIn search',
      location: 'United States',
      ats: /greenhouse/i.test(u)
        ? 'greenhouse'
        : /lever/i.test(u)
          ? 'lever'
          : 'ashby',
    })
  }

  // Best-effort titles from cards (short timeouts)
  const cards = page.locator(
    'li.jobs-search-results__list-item, div.job-card-container, li.scaffold-layout__list-item, div.job-card-list__entity-lockup',
  )
  const n = Math.min(await cards.count().catch(() => 0), 30)
  for (let i = 0; i < n; i++) {
    const card = cards.nth(i)
    const href = await card
      .locator('a[href*="/jobs/view/"]')
      .first()
      .getAttribute('href', { timeout: 800 })
      .catch(() => null)
    if (!href) continue
    const id = href.match(/\/jobs\/view\/(\d+)/)?.[1]
    if (!id) continue
    const title = (
      await card
        .locator('a.job-card-list__title, a.job-card-container__link, strong, h3')
        .first()
        .innerText({ timeout: 800 })
        .catch(() => '')
    )
      .replace(/\s+/g, ' ')
      .trim()
    const company = (
      await card
        .locator(
          '.job-card-container__primary-description, .artdeco-entity-lockup__subtitle, .job-card-list__company-name, h4',
        )
        .first()
        .innerText({ timeout: 800 })
        .catch(() => '')
    )
      .replace(/\s+/g, ' ')
      .trim()
    const existing = out.find((j) => j.url.includes(`/jobs/view/${id}`))
    if (existing) {
      if (title) existing.title = title.slice(0, 140)
      if (company) {
        existing.companyName = company.slice(0, 80)
        existing.companyId =
          company
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 40) || 'linkedin'
        existing.jdText = `${title || existing.title} at ${company} (LinkedIn)`
      }
    }
  }

  console.log(`  harvested=${out.length}`)
  return out
}

async function enrichJobPage(page: Page, job: DiscoveredJob): Promise<DiscoveredJob> {
  try {
    await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 25_000 })
    await page.waitForTimeout(1200)
    const title =
      (
        await page
          .locator('h1, .job-details-jobs-unified-top-card__job-title')
          .first()
          .innerText({ timeout: 3000 })
          .catch(() => job.title)
      ).trim() || job.title
    const company =
      (
        await page
          .locator(
            '.job-details-jobs-unified-top-card__company-name a, .job-details-jobs-unified-top-card__company-name',
          )
          .first()
          .innerText({ timeout: 3000 })
          .catch(() => job.companyName)
      ).trim() || job.companyName
    const loc =
      (
        await page
          .locator(
            '.job-details-jobs-unified-top-card__tertiary-description-container, .jobs-unified-top-card__bullet, .tvm__text',
          )
          .first()
          .innerText({ timeout: 2000 })
          .catch(() => job.location || 'United States')
      ).trim() || job.location || 'United States'
    const desc =
      (
        await page
          .locator('#job-details, .jobs-description__content, .jobs-box__html-content')
          .first()
          .innerText({ timeout: 3000 })
          .catch(() => '')
      ).slice(0, 8000) || job.jdText

    // Prefer external ATS apply URL when present (not Easy Apply)
    let applyHref = await page
      .locator(
        'a[href*="greenhouse"], a[href*="lever.co"], a[href*="ashbyhq"], a[href*="jobs.ashby"], a[href*="linkedin.com/safety/go"]',
      )
      .first()
      .getAttribute('href', { timeout: 2000 })
      .catch(() => null)

    if (applyHref?.includes('linkedin.com/safety/go')) {
      try {
        const u = new URL(
          applyHref.startsWith('http')
            ? applyHref
            : `https://www.linkedin.com${applyHref}`,
        )
        applyHref = decodeURIComponent(u.searchParams.get('url') || '')
      } catch {
        /* keep */
      }
    }

    let url = job.url
    let ats = job.ats
    if (applyHref && /greenhouse|lever|ashby/i.test(applyHref)) {
      url = applyHref.startsWith('http') ? applyHref : applyHref
      ats = applyHref.includes('greenhouse')
        ? 'greenhouse'
        : applyHref.includes('lever')
          ? 'lever'
          : 'ashby'
    }

    return {
      ...job,
      title: title.slice(0, 160),
      companyName: company.slice(0, 80),
      companyId:
        company
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 40) || job.companyId,
      jdText: desc,
      location: loc.slice(0, 120),
      url,
      ats,
    }
  } catch {
    return job
  }
}

async function main() {
  const user = process.env.JOB_JUGAAD_LI_USER?.trim()
  const pass = process.env.JOB_JUGAAD_LI_PASS?.trim()
  if (!user || !pass) {
    console.error(
      'Set JOB_JUGAAD_LI_USER and JOB_JUGAAD_LI_PASS for this process only (not .env files).',
    )
    process.exit(2)
  }

  buildResumeIndex()
  const cfg = loadCrawlConfig()
  const userData = resolveFromRoot('data/browser-profile-linkedin')
  fs.mkdirSync(userData, { recursive: true })
  const headed =
    process.env.JOB_JUGAAD_FORCE_HEADED === '1' ||
    Boolean(process.env.DISPLAY) ||
    process.platform === 'darwin'

  const context = await chromium.launchPersistentContext(userData, {
    headless: !headed,
    viewport: { width: 1400, height: 900 },
  })
  const page = context.pages()[0] || (await context.newPage())
  let found: DiscoveredJob[] = []

  try {
    await loginLinkedIn(page, user, pass)

    for (const url of cfg.linkedin_search_urls) {
      const batch = await harvestSearch(page, url)
      found.push(...batch)
    }

    // Dedupe by url
    const byUrl = new Map(found.map((j) => [j.url, j]))
    found = [...byUrl.values()]
    console.log(`Unique listings: ${found.length} — enriching top 15…`)
    writeStatus({ state: 'enriching', listings: found.length })

    const enriched: DiscoveredJob[] = []
    for (const [i, job] of found.slice(0, 15).entries()) {
      console.log(`  enrich ${i + 1}/${Math.min(15, found.length)} ${job.url}`)
      enriched.push(await enrichJobPage(page, job))
    }

    const n = await ingestDiscovered(enriched.length ? enriched : found, 'linkedin-auth', {
      preferMainResume: true,
      specializedMargin: cfg.specialized_margin,
      minFit: cfg.min_fit_to_queue,
    })
    writeStatus({ state: 'done', ingested: n, listings: found.length })
    console.log(`Ingested ${n} LinkedIn jobs into SQLite`)
  } finally {
    await context.close().catch(() => undefined)
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  writeStatus({
    state: 'error',
    error: err instanceof Error ? err.message : String(err),
  })
  process.exit(1)
})
