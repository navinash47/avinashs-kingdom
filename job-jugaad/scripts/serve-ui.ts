/**
 * Job Jugaad UI + SQLite API (no secrets).
 * Serves dashboard + /api/jobs|/api/companies|/api/gaps|/api/state
 */
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  dashboardPayload,
  queryJobs,
  companyStats,
  listGaps,
  jobStats,
} from '../src/db/client.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const port = Number(process.env.PORT || 5178)

function read(rel: string) {
  const p = path.join(root, rel)
  if (!fs.existsSync(p)) return null
  return fs.readFileSync(p)
}

function json(res: http.ServerResponse, body: unknown, code = 200) {
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  })
  res.end(JSON.stringify(body))
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://localhost:${port}`)

  if (url.pathname === '/api/state') {
    const index = read('data/resume-index.json')
    const payload = dashboardPayload()
    const tracks = index ? JSON.parse(index.toString()).tracks : []
    json(res, {
      ...payload,
      tracks,
      // legacy queue shape for older UI bits
      queue: payload.jobs
        .filter((j) =>
          ['queued', 'filling', 'waiting-on-you', 'submitted', 'failed'].includes(
            j.status,
          ),
        )
        .slice(0, 80)
        .map((j) => ({
          id: j.id,
          companyName: j.company_id,
          title: j.title,
          url: j.url,
          location: j.location,
          chosenResumeId: j.resume_track,
          fitScore: j.fit_score,
          status: j.status,
          gaps: [],
          error: j.error || undefined,
        })),
    })
    return
  }

  if (url.pathname === '/api/stats') {
    json(res, { stats: jobStats(), at: new Date().toISOString() })
    return
  }

  if (url.pathname === '/api/jobs') {
    json(
      res,
      queryJobs({
        status: url.searchParams.get('status') || undefined,
        companyId: url.searchParams.get('company') || undefined,
        q: url.searchParams.get('q') || undefined,
        minFit: Number(url.searchParams.get('minFit') || 0),
        limit: Number(url.searchParams.get('limit') || 100),
        offset: Number(url.searchParams.get('offset') || 0),
        usOnly: url.searchParams.get('us') !== '0',
        fullTimeOnly: url.searchParams.get('ft') !== '0',
      }),
    )
    return
  }

  if (url.pathname === '/api/companies') {
    json(res, companyStats())
    return
  }

  if (url.pathname === '/api/gaps') {
    json(
      res,
      listGaps({
        company: url.searchParams.get('company') || undefined,
        q: url.searchParams.get('q') || undefined,
        limit: Number(url.searchParams.get('limit') || 150),
      }),
    )
    return
  }

  if (url.pathname === '/gaps.xlsx') {
    const x = read('data/gaps.xlsx')
    if (!x) {
      res.writeHead(404)
      res.end('No gaps.xlsx yet')
      return
    }
    res.writeHead(200, {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="gaps.xlsx"',
    })
    res.end(x)
    return
  }

  if (url.pathname === '/resume-index.json') {
    const x = read('data/resume-index.json')
    res.writeHead(x ? 200 : 404, { 'Content-Type': 'application/json' })
    res.end(x || '{"tracks":[]}')
    return
  }

  const dist = path.join(root, 'apps/dashboard/dist')
  let file = path.join(dist, url.pathname === '/' ? 'index.html' : url.pathname)
  if (!file.startsWith(dist)) {
    res.writeHead(403)
    res.end('forbidden')
    return
  }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    file = path.join(dist, 'index.html')
  }
  if (!fs.existsSync(file)) {
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(
      `<!doctype html><html><body style="font-family:sans-serif;padding:2rem">
      <h1>Job Jugaad</h1>
      <p>UI not built yet. Run <code>npm run build:ui</code>.</p>
      <p><a href="/api/state">/api/state</a> · <a href="/api/jobs">/api/jobs</a></p>
      </body></html>`,
    )
    return
  }
  const ext = path.extname(file)
  const type =
    ext === '.js'
      ? 'text/javascript'
      : ext === '.css'
        ? 'text/css'
        : ext === '.html'
          ? 'text/html'
          : 'application/octet-stream'
  res.writeHead(200, { 'Content-Type': type })
  res.end(fs.readFileSync(file))
})

server.listen(port, () => {
  console.log(`Job Jugaad API/UI http://localhost:${port}`)
})
