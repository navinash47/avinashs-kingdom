/**
 * Shared Chrome / Chromium launch for Job Jugaad.
 *
 * Prefer real Chrome with the Chromium sandbox ON (no --no-sandbox).
 * Playwright defaults chromiumSandbox to false and injects --no-sandbox;
 * set chromiumSandbox: true to avoid that fingerprint when the host allows it.
 * Fall back to no-sandbox only if sandboxed launch fails (common in some containers).
 */
import fs from 'node:fs'
import { chromium, type BrowserContext, type LaunchOptions } from 'playwright'
import { resolveFromRoot } from '../lib/paths.js'

export type LaunchBrowserOpts = {
  /** Absolute or repo-relative profile dir under data/ */
  userDataDir?: string
  headed?: boolean
  viewport?: { width: number; height: number }
  /** Force --no-sandbox (JOB_JUGAAD_NO_SANDBOX=1 also forces this). */
  forceNoSandbox?: boolean
  /** Prefer channel chrome (default true unless JOB_JUGAAD_USE_CHROMIUM=1). */
  preferChrome?: boolean
}

function wantHeaded(explicit?: boolean): boolean {
  if (explicit !== undefined) return explicit
  return (
    process.env.JOB_JUGAAD_FORCE_HEADED === '1' ||
    Boolean(process.env.DISPLAY) ||
    process.platform === 'darwin'
  )
}

function preferChromeChannel(explicit?: boolean): boolean {
  if (explicit !== undefined) return explicit
  return (
    process.env.JOB_JUGAAD_USE_CHROMIUM !== '1' &&
    (process.platform === 'darwin' ||
      process.platform === 'linux' ||
      process.platform === 'win32')
  )
}

function forceNoSandbox(explicit?: boolean): boolean {
  if (explicit !== undefined) return explicit
  return process.env.JOB_JUGAAD_NO_SANDBOX === '1'
}

export async function launchJobBrowser(
  opts: LaunchBrowserOpts = {},
): Promise<BrowserContext> {
  const userData = opts.userDataDir
    ? opts.userDataDir.startsWith('/')
      ? opts.userDataDir
      : resolveFromRoot(opts.userDataDir)
    : resolveFromRoot('data/browser-profile')
  fs.mkdirSync(userData, { recursive: true })

  const headed = wantHeaded(opts.headed)
  const preferChrome = preferChromeChannel(opts.preferChrome)
  const noSandbox = forceNoSandbox(opts.forceNoSandbox)
  const viewport = opts.viewport ?? { width: 1280, height: 900 }

  const base: LaunchOptions & {
    viewport: { width: number; height: number }
    acceptDownloads: boolean
    locale: string
    timezoneId: string
  } = {
    headless: !headed,
    viewport,
    acceptDownloads: true,
    locale: 'en-US',
    timezoneId: 'America/New_York',
  }

  const tryLaunch = async (sandbox: boolean, channel?: 'chrome') => {
    return chromium.launchPersistentContext(userData, {
      ...base,
      channel,
      chromiumSandbox: sandbox,
    })
  }

  if (noSandbox) {
    console.log('Chrome launch: --no-sandbox forced (JOB_JUGAAD_NO_SANDBOX=1)')
    try {
      return await tryLaunch(false, preferChrome ? 'chrome' : undefined)
    } catch {
      return tryLaunch(false)
    }
  }

  // Sandbox first — removes Playwright's default --no-sandbox fingerprint
  try {
    const ctx = await tryLaunch(true, preferChrome ? 'chrome' : undefined)
    console.log('Chrome launch: chromiumSandbox=true (no --no-sandbox)')
    return ctx
  } catch (err) {
    console.warn(
      'Sandboxed Chrome failed; falling back to --no-sandbox:',
      err instanceof Error ? err.message.slice(0, 200) : err,
    )
  }

  try {
    const ctx = await tryLaunch(false, preferChrome ? 'chrome' : undefined)
    console.log('Chrome launch: fallback chromiumSandbox=false (--no-sandbox)')
    return ctx
  } catch {
    const ctx = await tryLaunch(false)
    console.log('Chrome launch: bundled Chromium fallback (--no-sandbox)')
    return ctx
  }
}
