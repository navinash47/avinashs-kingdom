import fs from 'node:fs'
import yaml from 'js-yaml'
import { resolveFromRoot } from '../lib/paths.js'
import { isOmniReachable, omniWebFetch } from '../omni/client.js'

export type ProfileData = {
  name: { first: string; last: string; full: string }
  email?: string
  phone?: string
  location?: string
  linkedin?: string
  github?: string
  website?: string
  youtube?: string
  headline?: string
  about?: string
  years_experience?: string
  work_authorization?: string
  sponsorship_needed?: string
  authorized_to_work?: string
  visa_status?: string
  canned_answers?: Record<string, string>
  learned_answers?: Record<string, string>
  enrich_sources?: string[]
  enriched_at?: string
}

const WORK_AUTH_DEFAULTS: Partial<ProfileData> = {
  work_authorization: 'F-1 OPT',
  sponsorship_needed: 'yes',
  authorized_to_work: 'yes',
  visa_status: 'OPT',
}

const CANNED_DEFAULTS: Record<string, string> = {
  why_company:
    'I build reliable AI/backend systems and want to contribute where the product leverage is high.',
  biggest_strength:
    'Shipping end-to-end systems from data/models to production APIs.',
  work_auth_detail:
    'Currently on F-1 OPT; will require future work authorization / sponsorship.',
  legally_authorized: 'Yes',
  require_sponsorship: 'Yes',
  visa_status: 'F-1 OPT',
}

function isBlank(v: unknown): boolean {
  return v == null || (typeof v === 'string' && !v.trim())
}

/** Merge without wiping non-empty hand-set fields. */
export function mergeProfile(
  existing: ProfileData,
  patch: Partial<ProfileData>,
): ProfileData {
  const next: ProfileData = {
    ...existing,
    name: { ...existing.name, ...(patch.name || {}) },
    canned_answers: {
      ...(existing.canned_answers || {}),
      ...(patch.canned_answers || {}),
    },
    learned_answers: {
      ...(existing.learned_answers || {}),
      ...(patch.learned_answers || {}),
    },
  }
  for (const key of Object.keys(patch) as Array<keyof ProfileData>) {
    if (key === 'name' || key === 'canned_answers' || key === 'learned_answers') {
      continue
    }
    const val = patch[key]
    if (typeof val === 'string' && !isBlank(val) && isBlank(existing[key])) {
      ;(next as Record<string, unknown>)[key] = val
    } else if (typeof val === 'string' && !isBlank(val) && key.startsWith('enrich')) {
      ;(next as Record<string, unknown>)[key] = val
    } else if (Array.isArray(val)) {
      ;(next as Record<string, unknown>)[key] = [
        ...new Set([
          ...((existing[key] as string[]) || []),
          ...val,
        ]),
      ]
    }
  }
  // Always refresh work-auth defaults if empty
  for (const [k, v] of Object.entries(WORK_AUTH_DEFAULTS)) {
    if (isBlank((next as Record<string, unknown>)[k])) {
      ;(next as Record<string, unknown>)[k] = v
    }
  }
  next.canned_answers = { ...CANNED_DEFAULTS, ...next.canned_answers }
  return next
}

export function loadProfile(): ProfileData {
  const p = resolveFromRoot('data/profile.yaml')
  if (!fs.existsSync(p)) {
    return {
      name: { first: 'Avinash', last: 'Nandyala', full: 'Avinash Nandyala' },
    }
  }
  return yaml.load(fs.readFileSync(p, 'utf8')) as ProfileData
}

export function saveProfile(profile: ProfileData): string {
  const p = resolveFromRoot('data/profile.yaml')
  const body = yaml.dump(profile, { lineWidth: 100, noRefs: true })
  fs.writeFileSync(p, body)
  return p
}

export function rememberAnswer(
  question: string,
  answer: string,
): ProfileData {
  const profile = loadProfile()
  const key = question.trim().slice(0, 160)
  profile.learned_answers = {
    ...(profile.learned_answers || {}),
    [key]: answer,
  }
  // Mirror common work-auth questions into canned
  if (/sponsor|visa|opt|authoriz|work.?auth/i.test(question)) {
    profile.canned_answers = {
      ...(profile.canned_answers || {}),
      [key]: answer,
    }
  }
  saveProfile(profile)
  return profile
}

export async function crawlPublicProfile(url: string): Promise<string> {
  if (!url) return ''
  if (await isOmniReachable()) {
    try {
      return await omniWebFetch(url, { provider: 'firecrawl' })
    } catch (err) {
      console.warn(
        'OmniRoute fetch failed:',
        err instanceof Error ? err.message : err,
      )
    }
  }
  // Direct fallback for public APIs / simple pages
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'JobJugaadProfileBot/0.1' },
    })
    if (!res.ok) return ''
    return (await res.text()).slice(0, 20000)
  } catch {
    return ''
  }
}

export function inferFromCrawlText(text: string): Partial<ProfileData> {
  const patch: Partial<ProfileData> = {}
  if (/Amherst,\s*Massachusetts/i.test(text)) {
    patch.location = 'Amherst, Massachusetts, United States'
  } else if (/United States/i.test(text) && !patch.location) {
    patch.location = 'United States'
  }
  const about = text.match(
    /I am a Software Development Engineer[\s\S]{0,900}?Actively exploring[^.]*\./i,
  )
  if (about) patch.about = about[0].replace(/\s+/g, ' ').trim()
  if (/4\+\s*years/i.test(text)) patch.years_experience = '4+'
  const headline = text.match(
    /MSCS at UMass Amherst[^\n]{0,160}/i,
  )
  if (headline) patch.headline = headline[0].trim()
  return patch
}
