/**
 * 15-minute Job Jugaad tick:
 *  1) Crawl LinkedIn (auth) + web/Firecrawl/ATS (agent does search itself)
 *  2) Auto-apply with up to 3 attempts per jid → then manual-apply
 *  3) Email digest of Cloudflare / not-applied links for manual apply
 *
 *   npm run tick:15m
 */
import { spawn } from 'node:child_process'
import { resolveFromRoot, writeJson } from '../src/lib/paths.js'
import { jobStats } from '../src/db/client.js'

function run(
  label: string,
  npmScript: string,
  extraArgs: string[] = [],
  env: NodeJS.ProcessEnv = {},
): Promise<number> {
  return new Promise((resolve) => {
    console.log(`\n======== ${label} ========`)
    const child = spawn(
      'npm',
      ['run', npmScript, ...(extraArgs.length ? ['--', ...extraArgs] : [])],
      {
        cwd: resolveFromRoot('.'),
        env: { ...process.env, ...env },
        stdio: 'inherit',
        shell: false,
      },
    )
    child.on('exit', (code) => resolve(code ?? 1))
    child.on('error', (err) => {
      console.error(label, err)
      resolve(1)
    })
  })
}

async function main() {
  const started = new Date().toISOString()
  const codes: Record<string, number> = {}

  // Agent crawls: Firecrawl/web + ATS always; LinkedIn auth when LI env present
  codes.crawl = await run('crawl:jobs (ATS + Firecrawl/web)', 'crawl:jobs', [
    '--skip-linkedin',
  ])

  if (
    process.env.JOB_JUGAAD_LI_USER?.trim() &&
    process.env.JOB_JUGAAD_LI_PASS?.trim()
  ) {
    codes.linkedin = await run(
      'crawl:linkedin:auth',
      'crawl:linkedin:auth',
      [],
      { JOB_JUGAAD_FORCE_HEADED: '1' },
    )
  } else {
    console.log(
      '\n(skip LinkedIn auth crawl — set JOB_JUGAAD_LI_USER + JOB_JUGAAD_LI_PASS for this process)',
    )
    codes.linkedin = 0
  }

  codes.apply = await run(
    'auto:apply (≤3 attempts / jid)',
    'auto:apply',
    ['--limit', process.env.JOB_JUGAAD_APPLY_LIMIT || '3'],
    {
      JOB_JUGAAD_FORCE_HEADED: '1',
      JOB_JUGAAD_SKIP_HUMAN_WAIT: '1',
    },
  )

  codes.digest = await run('notify:digest (manual Cloudflare links)', 'notify:digest')

  const summary = {
    at: started,
    finishedAt: new Date().toISOString(),
    codes,
    stats: jobStats(),
  }
  writeJson('data/tick-15m-report.json', summary)
  console.log('\n======== tick:15m done ========')
  console.log(summary)
  if (Object.values(codes).some((c) => c !== 0)) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
