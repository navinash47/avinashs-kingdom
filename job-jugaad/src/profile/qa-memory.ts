import fs from 'node:fs'
import path from 'node:path'
import { rememberAnswer, type ProfileData } from './enrich.js'

const KINGDOM_ROOT = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  '../../..',
)

function brainPaths() {
  return {
    entity: path.join(KINGDOM_ROOT, 'brain/wiki/entities/avinash-profile.md'),
    concept: path.join(
      KINGDOM_ROOT,
      'brain/wiki/concepts/job-jugaad-qa-memory.md',
    ),
    index: path.join(KINGDOM_ROOT, 'brain/wiki/index.md'),
    log: path.join(KINGDOM_ROOT, 'brain/wiki/log.md'),
  }
}

/** Persist Q&A to profile.yaml and Kingdom KG (no phone/email dumps in brain). */
export function learnQa(
  question: string,
  answer: string,
  meta?: { company?: string; role?: string },
): ProfileData {
  const profile = rememberAnswer(question, answer)
  const { entity, concept } = brainPaths()
  fs.mkdirSync(path.dirname(entity), { recursive: true })
  fs.mkdirSync(path.dirname(concept), { recursive: true })

  const safeQ = question.replace(/\n/g, ' ').slice(0, 200)
  const safeA = answer.replace(/\n/g, ' ').slice(0, 400)
  const stamp = new Date().toISOString().slice(0, 10)
  const where = [meta?.company, meta?.role].filter(Boolean).join(' / ')

  const entityBlock = `\n## [${stamp}] Q&A${where ? ` · ${where}` : ''}\n\n- **Q:** ${safeQ}\n- **A:** ${safeA}\n`
  if (!fs.existsSync(entity)) {
    fs.writeFileSync(
      entity,
      `---
type: entity
updated: ${stamp}
tags: [profile, job-jugaad]
---

# Avinash Nandyala (apply profile KG)

Non-secret career facts and learned ATS answers for Job Jugaad. Phone/email live only in \`job-jugaad/data/profile.yaml\`.

## Standing work authorization

- Status: F-1 OPT
- Legally authorized to work now: Yes
- Needs future sponsorship / work authorization: Yes

`,
    )
  }
  fs.appendFileSync(entity, entityBlock)

  if (!fs.existsSync(concept)) {
    fs.writeFileSync(
      concept,
      `---
type: concept
updated: ${stamp}
tags: [job-jugaad, qa]
---

# Job Jugaad Q&A memory

New ATS questions discovered during apply runs are stored in:

1. \`job-jugaad/data/profile.yaml\` → \`learned_answers\`
2. Entity [[entities/avinash-profile]] (non-secret answers only)

Agents should reuse \`learned_answers\` before calling the LLM for custom questions.
`,
    )
  } else {
    fs.appendFileSync(
      concept,
      `\n- ${stamp}: learned “${safeQ.slice(0, 80)}…”\n`,
    )
  }

  return profile
}

export function answerFromProfile(
  question: string,
  profile: ProfileData,
): string | null {
  const q = question.toLowerCase()
  const learned = profile.learned_answers || {}
  for (const [k, v] of Object.entries(learned)) {
    if (q.includes(k.toLowerCase().slice(0, 40)) || k.toLowerCase().includes(q.slice(0, 40))) {
      return v
    }
  }
  const canned = profile.canned_answers || {}
  if (/sponsor|work.?auth|visa|opt|immigration/i.test(q)) {
    if (/future|sponsor|require/i.test(q)) {
      return canned.require_sponsorship || profile.sponsorship_needed || 'Yes'
    }
    if (/legal|authoriz|eligible|permitted/i.test(q)) {
      return canned.legally_authorized || profile.authorized_to_work || 'Yes'
    }
    return canned.work_auth_detail || profile.work_authorization || 'F-1 OPT'
  }
  if (/why.*(company|us|role)|interest/i.test(q)) {
    return canned.why_company || null
  }
  if (/strength|greatest/i.test(q)) return canned.biggest_strength || null
  if (/linkedin/i.test(q)) return profile.linkedin || null
  if (/github/i.test(q)) return profile.github || null
  if (/website|portfolio/i.test(q)) return profile.website || null
  if (/phone|mobile/i.test(q)) return profile.phone || null
  if (/location|city|reside/i.test(q)) return profile.location || null
  if (/experience|years/i.test(q)) return profile.years_experience || null
  return null
}
