/**
 * Full-time filter — Job Jugaad applies to FT roles only by default.
 * Internships, co-ops, part-time, and similar are skipped.
 */

const NON_FT_TITLE =
  /\b(intern(ship)?s?|co-?ops?|apprentices?(hip)?|trainees?|part[-\s]?time|seasonal|temporary|contract(or)?\b(?!\s+software)|fellow(ship)?s?)\b/i

const NON_FT_JD =
  /\b(employment\s*type\s*[:\-]?\s*)?(internship|part[-\s]?time|temporary|seasonal)\b/i

export function isFullTimeRole(title: string, jdText = ''): boolean {
  const t = (title || '').trim()
  if (!t) return false
  if (NON_FT_TITLE.test(t)) return false
  // Strong JD signals only (avoid false positives in long descriptions)
  const head = (jdText || '').slice(0, 1200)
  if (NON_FT_JD.test(head) && !/\bfull[-\s]?time\b/i.test(head)) return false
  return true
}


/** Prefer IC SWE/MLE/AI roles — skip pure people-manager / mobile-only titles for auto-apply. */
const SKIP_AUTO =
  /\b(engineering manager|manager,? personalization|director|vice president|\bvp\b|head of|staff software engineer,? ios|ios engineer|android engineer|mobile engineer)\b/i

export function isTargetApplyRole(title: string, jdText = ''): boolean {
  if (!isFullTimeRole(title, jdText)) return false
  if (SKIP_AUTO.test(title)) return false
  return true
}
