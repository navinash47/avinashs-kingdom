import fs from 'node:fs'
import {
  type ResumesConfig,
  readYaml,
  resolveFromRoot,
} from '../src/lib/paths.js'
import { buildResumeIndex } from '../src/score/index-resumes.js'
import {
  classifyLinks,
  extractLinksFromFiles,
} from '../src/profile/extract-links.js'
import {
  crawlPublicProfile,
  inferFromCrawlText,
  loadProfile,
  mergeProfile,
  saveProfile,
} from '../src/profile/enrich.js'

/** Public seeds when Desktop resume hyperlinks are missing (cloud / fixtures). */
const PUBLIC_SEEDS = {
  linkedin: 'https://www.linkedin.com/in/avinash-nandyala-06a88b199',
  github: 'https://github.com/navinash47',
  website: 'https://hcr.cs.umass.edu/people.html',
  youtube: 'https://www.youtube.com/@avinashnandyala',
  email: 'avinashnandyala2@gmail.com',
}

async function main() {
  const index = buildResumeIndex()
  const cfg = readYaml<ResumesConfig>('config/resumes.yaml')
  const allPaths = cfg.tracks.flatMap((t) =>
    t.paths.map((p) => resolveFromRoot(p)),
  ).filter((p) => fs.existsSync(p))

  const links = extractLinksFromFiles([
    ...allPaths,
    ...index.tracks.map((t) => t.filePath),
  ])
  console.log(
    `Extracted ${links.urls.length} urls, ${links.emails.length} emails from ${links.sources.length} files`,
  )

  const classified = classifyLinks(links.urls)
  const linkedin = classified.linkedin || PUBLIC_SEEDS.linkedin
  const github = classified.github || PUBLIC_SEEDS.github
  const website = classified.website || PUBLIC_SEEDS.website
  const email =
    links.emails[0] ||
    PUBLIC_SEEDS.email
  const phone = links.phones[0] || ''

  const existing = loadProfile()
  let patch = mergeProfile(existing, {
    email,
    phone,
    linkedin,
    github,
    website,
    youtube: PUBLIC_SEEDS.youtube,
    work_authorization: 'F-1 OPT',
    sponsorship_needed: 'yes',
    authorized_to_work: 'yes',
    visa_status: 'OPT',
    enrich_sources: links.sources,
    enriched_at: new Date().toISOString(),
  })

  console.log('Crawling LinkedIn (public)…')
  const liText = await crawlPublicProfile(linkedin)
  if (liText) {
    patch = mergeProfile(patch, inferFromCrawlText(liText))
    console.log('  LinkedIn crawl bytes:', liText.length)
  } else {
    // Use known public summary when crawl blocked
    patch = mergeProfile(patch, {
      location: 'Amherst, Massachusetts, United States',
      headline:
        'MSCS at UMass Amherst | Robotics & Reinforcement Learning | Backend Systems | Ex-Mastercard',
      about:
        'Software Development Engineer with 4+ years building secure, scalable systems across fintech, ML, and robotics. Graduate researcher at UMass Amherst (Human-Centered Robotics Lab). Previously Mastercard. Currently on F-1 OPT; will need future work authorization.',
      years_experience: '4+',
    })
    console.log('  LinkedIn crawl empty — applied public seed summary')
  }

  console.log('Crawling GitHub…')
  const ghApi = await crawlPublicProfile('https://api.github.com/users/navinash47')
  if (ghApi) {
    try {
      const j = JSON.parse(ghApi) as {
        bio?: string
        location?: string
        blog?: string
        html_url?: string
      }
      patch = mergeProfile(patch, {
        github: j.html_url || github,
        location: j.location || patch.location,
        about: patch.about || j.bio,
        website: j.blog || patch.website,
      })
    } catch {
      patch = mergeProfile(patch, inferFromCrawlText(ghApi))
    }
  }

  console.log('Crawling lab/website…')
  const siteText = await crawlPublicProfile(website)
  if (siteText) {
    patch = mergeProfile(patch, inferFromCrawlText(siteText))
  }

  // Force OPT facts (user-specified) even if prior empties were filled
  patch.work_authorization = 'F-1 OPT'
  patch.sponsorship_needed = 'yes'
  patch.authorized_to_work = 'yes'
  patch.visa_status = 'OPT'
  patch.canned_answers = {
    ...(patch.canned_answers || {}),
    work_auth_detail:
      'Currently on F-1 OPT; will require future work authorization / sponsorship.',
    legally_authorized: 'Yes',
    require_sponsorship: 'Yes',
    visa_status: 'F-1 OPT',
  }

  const out = saveProfile(patch)
  console.log('Wrote', out)
  console.log(
    JSON.stringify(
      {
        email: patch.email,
        phone: patch.phone || '(missing — add manually)',
        location: patch.location,
        linkedin: patch.linkedin,
        github: patch.github,
        website: patch.website,
        work_authorization: patch.work_authorization,
        sponsorship_needed: patch.sponsorship_needed,
      },
      null,
      2,
    ),
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
