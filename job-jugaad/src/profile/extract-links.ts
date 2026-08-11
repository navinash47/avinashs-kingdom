import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { resolveFromRoot } from '../lib/paths.js'

const require = createRequire(import.meta.url)

export type ExtractedLinks = {
  urls: string[]
  emails: string[]
  phones: string[]
  sources: string[]
}

const URL_RE = /https?:\/\/[^\s<>"'\\\]]+/gi
const MAIL_RE = /mailto:([\w.+-]+@[\w.-]+\.\w+)/gi
const EMAIL_RE = /[\w.+-]+@[\w.-]+\.\w+/g
const PHONE_RE =
  /(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/g

function cleanUrl(u: string): string {
  return u.replace(/[),.;]+$/g, '').trim()
}

function extractFromText(text: string, into: ExtractedLinks): void {
  for (const m of text.match(URL_RE) || []) into.urls.push(cleanUrl(m))
  for (const m of text.matchAll(MAIL_RE)) into.emails.push(m[1])
  for (const m of text.match(EMAIL_RE) || []) into.emails.push(m)
  for (const m of text.match(PHONE_RE) || []) into.phones.push(m.trim())
}

function extractDocx(filePath: string, into: ExtractedLinks): void {
  // Minimal ZIP walk without extra deps: docx is a zip of XML parts
  // Use adm-zip if present; else raw string scan of file bytes for http(s)
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const AdmZip = require('adm-zip') as typeof import('adm-zip')
    const zip = new AdmZip(filePath)
    for (const entry of zip.getEntries()) {
      if (!entry.entryName.endsWith('.xml') && !entry.entryName.endsWith('.rels')) {
        continue
      }
      const xml = entry.getData().toString('utf8')
      extractFromText(xml, into)
      for (const m of xml.matchAll(/Target="(https?:[^"]+)"/g)) {
        into.urls.push(cleanUrl(m[1]))
      }
      for (const m of xml.matchAll(/Target="mailto:([^"]+)"/g)) {
        into.emails.push(m[1])
      }
    }
  } catch {
    const raw = fs.readFileSync(filePath)
    extractFromText(raw.toString('latin1'), into)
  }
  into.sources.push(filePath)
}

function extractPdf(filePath: string, into: ExtractedLinks): void {
  const raw = fs.readFileSync(filePath).toString('latin1')
  extractFromText(raw, into)
  for (const m of raw.matchAll(/\/URI\s*\((https?:[^)]+)\)/g)) {
    into.urls.push(cleanUrl(m[1]))
  }
  into.sources.push(filePath)
}

function extractTxt(filePath: string, into: ExtractedLinks): void {
  extractFromText(fs.readFileSync(filePath, 'utf8'), into)
  into.sources.push(filePath)
}

export function extractLinksFromResume(filePath: string): ExtractedLinks {
  const into: ExtractedLinks = { urls: [], emails: [], phones: [], sources: [] }
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.docx') extractDocx(filePath, into)
  else if (ext === '.pdf') extractPdf(filePath, into)
  else extractTxt(filePath, into)
  into.urls = [...new Set(into.urls)]
  into.emails = [...new Set(into.emails.map((e) => e.toLowerCase()))]
  into.phones = [...new Set(into.phones)]
  return into
}

export function extractLinksFromFiles(paths: string[]): ExtractedLinks {
  const merged: ExtractedLinks = { urls: [], emails: [], phones: [], sources: [] }
  for (const p of paths) {
    const full = path.isAbsolute(p) ? p : resolveFromRoot(p)
    if (!fs.existsSync(full)) continue
    const part = extractLinksFromResume(full)
    merged.urls.push(...part.urls)
    merged.emails.push(...part.emails)
    merged.phones.push(...part.phones)
    merged.sources.push(...part.sources)
  }
  merged.urls = [...new Set(merged.urls)]
  merged.emails = [...new Set(merged.emails)]
  merged.phones = [...new Set(merged.phones)]
  return merged
}

export function classifyLinks(urls: string[]) {
  const linkedin = urls.find((u) => /linkedin\.com\/in\//i.test(u)) || ''
  const github = urls.find((u) => /github\.com\/[^/]+\/?$/i.test(u)) ||
    urls.find((u) => /github\.com\/[^/]+/i.test(u)) ||
    ''
  const website =
    urls.find(
      (u) =>
        !/linkedin\.com|github\.com|googleapis|google\.com|schemas\.openxml/i.test(
          u,
        ),
    ) || ''
  return { linkedin, github, website }
}
