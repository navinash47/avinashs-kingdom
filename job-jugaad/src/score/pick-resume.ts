import type { GapRow, ResumeIndex, ResumeIndexEntry } from '../lib/paths.js'
import { isOmniReachable, omniChat } from '../omni/client.js'
import { loadResumeIndex } from './index-resumes.js'

export { loadResumeIndex, buildResumeIndex } from './index-resumes.js'
export type { GapRow } from '../lib/paths.js'

export type PickResult = {
  track: ResumeIndexEntry
  confidence: number
  fitScore: number
  reason: string
  gaps: GapRow[]
}

function tokenize(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9+\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2),
  )
}

function localPick(
  jdText: string,
  index: ResumeIndex,
  company: string,
  role: string,
): PickResult {
  const jdTokens = tokenize(`${role}\n${role}\n${jdText}`)
  let best: ResumeIndexEntry | null = null
  let bestScore = -1
  const scores: Array<{ id: string; score: number }> = []

  for (const t of index.tracks) {
    const bag = tokenize([...t.keywords, t.label, t.summary].join(' '))
    let hit = 0
    for (const k of bag) if (jdTokens.has(k)) hit++
    // Prefer specialized tracks when their keywords appear in the role title
    const title = role.toLowerCase()
    let boost = 0
    for (const k of t.keywords) {
      if (title.includes(k.toLowerCase())) boost += 0.15
    }
    if (t.id === 'backend' && /backend|api engineer/i.test(title)) boost += 0.35
    if (t.id === 'backend-mle' && /mle|machine learning|ml infra|rl training|reinforcement/i.test(title))
      boost += 0.35
    if (t.id === 'genai-llm' && /genai|llm|applied ai|language model/i.test(title))
      boost += 0.35
    if (t.id !== 'general') boost += 0.02
    const score = (bag.size ? hit / Math.min(40, bag.size) : 0) + boost
    scores.push({ id: t.id, score })
    if (score > bestScore) {
      bestScore = score
      best = t
    }
  }
  if (!best) throw new Error('Resume index is empty')

  const confidence = Math.max(0.15, Math.min(0.95, bestScore * 1.4))
  const fitScore = Math.round(confidence * 100)
  const missing: string[] = []
  const want = [
    'kubernetes',
    'terraform',
    'rust',
    'java',
    'scala',
    'spark',
    'cuda',
    'hipaa',
    'fhir',
    'langchain',
    'rag',
    'pytorch',
    'golang',
    'kafka',
  ]
  const have = tokenize(best.summary + ' ' + best.keywords.join(' '))
  for (const w of want) {
    if (jdTokens.has(w) && !have.has(w)) missing.push(w)
  }

  const gaps: GapRow[] = missing.map((gap) => ({
    company,
    role,
    chosenResume: best!.label,
    gap,
    why: `JD emphasizes ${gap}; selected resume (${best!.id}) does not clearly show it`,
    learnNext: `Study / practice ${gap} enough to speak to a project or add later (do not auto-edit resume)`,
  }))

  return {
    track: best,
    confidence,
    fitScore,
    reason: `Local keyword match; scores=${scores
      .map((s) => `${s.id}:${s.score.toFixed(2)}`)
      .join(',')}`,
    gaps,
  }
}

async function llmRefineGaps(
  jdText: string,
  pick: PickResult,
  company: string,
  role: string,
): Promise<GapRow[]> {
  const prompt = `You compare a job description to a FIXED resume track summary.
Return ONLY JSON array of gaps: [{"gap":"...","why":"...","learnNext":"..."}]
Max 6 items. Do not suggest editing the resume file.

Company: ${company}
Role: ${role}
Chosen track: ${pick.track.id} (${pick.track.label})
Resume summary:
${pick.track.summary.slice(0, 1500)}

JD:
${jdText.slice(0, 3500)}`

  try {
    const raw = await omniChat(
      [
        {
          role: 'system',
          content: 'You output compact JSON only. No markdown.',
        },
        { role: 'user', content: prompt },
      ],
      { model: 'auto', temperature: 0.1 },
    )
    const json = raw.replace(/^```json\s*|\s*```$/g, '').trim()
    const arr = JSON.parse(json) as Array<{
      gap: string
      why: string
      learnNext: string
    }>
    return arr.map((g) => ({
      company,
      role,
      chosenResume: pick.track.label,
      gap: g.gap,
      why: g.why,
      learnNext: g.learnNext,
    }))
  } catch {
    return pick.gaps
  }
}

export async function pickResumeForJd(opts: {
  jdText: string
  company?: string
  role?: string
  useLlm?: boolean
}): Promise<PickResult> {
  const index = loadResumeIndex()
  const company = opts.company || 'Unknown'
  const role = opts.role || 'Role'
  const pick = localPick(opts.jdText, index, company, role)

  if (opts.useLlm !== false && (await isOmniReachable())) {
    const gaps = await llmRefineGaps(opts.jdText, pick, company, role)
    return { ...pick, gaps: gaps.length ? gaps : pick.gaps }
  }
  return pick
}
