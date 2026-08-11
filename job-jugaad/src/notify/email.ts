/**
 * Notify via Gmail SMTP when apply needs human CAPTCHA / take-control.
 * Creds: JOB_JUGAAD_GMAIL_USER + JOB_JUGAAD_GMAIL_APP_PASSWORD (process-only)
 * or interactive prompt when TTY. Never write to .env / brain.
 */
import fs from 'node:fs'
import nodemailer from 'nodemailer'
import { loadProfile } from '../profile/enrich.js'
import { promptGmailCreds } from '../secrets/prompt.js'

export type WaitingNotify = {
  company: string
  title: string
  url: string
  jobId?: string
  reason: string
  screenshotPath?: string | null
}

async function resolveMailCreds(): Promise<{
  address: string
  appPassword: string
} | null> {
  const envAddr = process.env.JOB_JUGAAD_GMAIL_USER?.trim()
  const envPass = process.env.JOB_JUGAAD_GMAIL_APP_PASSWORD?.trim()
  if (envAddr && envPass) return { address: envAddr, appPassword: envPass }
  if (process.stdin.isTTY) {
    try {
      return await promptGmailCreds()
    } catch {
      return null
    }
  }
  return null
}

export async function notifyWaitingOnYou(info: WaitingNotify): Promise<boolean> {
  const profile = loadProfile()
  const to =
    process.env.JOB_JUGAAD_NOTIFY_EMAIL?.trim() ||
    profile.email ||
    'avinashnandyala2@gmail.com'

  const creds = await resolveMailCreds()
  if (!creds) {
    console.warn(
      'Email notify skipped — set JOB_JUGAAD_GMAIL_USER + JOB_JUGAAD_GMAIL_APP_PASSWORD for this process (or run with TTY).',
    )
    console.warn(
      `  Take control: open Cursor cloud Chrome → ${info.url}\n` +
        `  Then: touch /tmp/job-jugaad-apply-continue  OR  npm run resume:waiting`,
    )
    return false
  }

  const continueHint =
    `1) Open Cursor cloud desktop and the headed Chrome window\n` +
    `2) Solve CAPTCHA / finish the form for:\n   ${info.url}\n` +
    `3) Then either:\n` +
    `   touch /tmp/job-jugaad-apply-continue\n` +
    `   or run: cd job-jugaad && npm run resume:waiting\n`

  const subject = `[Job Jugaad] CAPTCHA / take control — ${info.company}: ${info.title}`
  const text =
    `Job Jugaad needs you in the Cursor cloud environment.\n\n` +
    `Company: ${info.company}\n` +
    `Role: ${info.title}\n` +
    `Reason: ${info.reason}\n` +
    `URL: ${info.url}\n` +
    (info.jobId ? `Job id: ${info.jobId}\n` : '') +
    `\n${continueHint}\n` +
    `Automation cadence is every 15 minutes (not every minute).\n`

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: creds.address,
      pass: creds.appPassword.replace(/\s+/g, ''),
    },
  })

  const attachments =
    info.screenshotPath && fs.existsSync(info.screenshotPath)
      ? [
          {
            filename: 'waiting-on-you.png',
            path: info.screenshotPath,
          },
        ]
      : []

  try {
    await transporter.sendMail({
      from: `"Job Jugaad" <${creds.address}>`,
      to,
      subject,
      text,
      attachments,
    })
    console.log(`📧 Notified ${to} — take control for ${info.company}`)
    return true
  } catch (err) {
    console.warn(
      'Email notify failed:',
      err instanceof Error ? err.message : err,
    )
    return false
  }
}
