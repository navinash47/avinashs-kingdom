/**
 * US-only location gate — Job Jugaad applies to US / US-remote roles.
 * Explicitly rejects Brazil, LatAm, EMEA, APAC-only postings.
 */

const NON_US =
  /\b(brazil|brasil|s[aã]o\s*paulo|rio\s*de\s*janeiro|belo\s*horizonte|curitiba|latam|latin\s*america|argentina|colombia|chile|mexico\s*city|ciudad\s*de\s*m[eé]xico|canada|toronto|vancouver|montreal|united\s*kingdom|\buk\b|london|ireland|dublin|india|bangalore|bengaluru|hyderabad|chennai|pune|europe|germany|berlin|munich|france|paris|netherlands|amsterdam|spain|madrid|portugal|lisbon|singapore|australia|sydney|melbourne|japan|tokyo|korea|seoul|israel|tel\s*aviv|uae|dubai|remote\s*[–\-:]?\s*(emea|latam|apac|eu|europe|india|uk|canada))\b/i

const US_POSITIVE =
  /\b(united\s*states|\bUSA\b|\bU\.S\.A\.?\b|\bUS\b|remote\s*[–\-:]?\s*US|US\s*[–\-:]?\s*remote|san\s*francisco|bay\s*area|new\s*york|nyc|seattle|austin|boston|chicago|denver|atlanta|los\s*angeles|\bLA\b|san\s*diego|miami|dallas|houston|washington\s*d\.?c\.?|amherst|massachusetts|\bMA\b|\bCA\b|\bNY\b|\bWA\b|\bTX\b|\bCO\b|\bIL\b|\bGA\b|nationwide\s*US)\b/i

export function isUsRole(
  location: string | null | undefined,
  title = '',
  jdText = '',
): boolean {
  const loc = (location || '').trim()
  const head = `${loc} ${title} ${(jdText || '').slice(0, 1800)}`

  if (loc && NON_US.test(loc) && !US_POSITIVE.test(loc)) return false
  if (NON_US.test(head) && !US_POSITIVE.test(head)) return false

  // Location field clearly US
  if (loc && US_POSITIVE.test(loc)) return true
  // Empty location on US company boards — allow unless JD screams non-US
  if (!loc) {
    if (NON_US.test(jdText.slice(0, 1800)) && !US_POSITIVE.test(jdText.slice(0, 1800))) {
      return false
    }
    return true
  }
  // Ambiguous location string with no US signal — reject if it looks geographic abroad
  if (NON_US.test(loc)) return false
  if (US_POSITIVE.test(head)) return true
  // City-only abroad often caught by NON_US; remaining unknowns: keep if not obviously foreign
  return !/,\s*(BR|MX|CA|GB|UK|IN|DE|FR|IE|NL|SG|AU)\s*$/i.test(loc)
}
