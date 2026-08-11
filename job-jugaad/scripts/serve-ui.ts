/**
 * Tiny static file server for the Job Jugaad UI (no secret env).
 * Serves built UI or vite-dev can proxy via npm run dev after copying JSON.
 */
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const port = Number(process.env.PORT || 5178)

function read(rel: string) {
  const p = path.join(root, rel)
  if (!fs.existsSync(p)) return null
  return fs.readFileSync(p)
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://localhost:${port}`)
  if (url.pathname === '/api/state') {
    const index = read('data/resume-index.json')
    const queue = read('data/queue.json')
    const body = {
      tracks: index ? JSON.parse(index.toString()).tracks : [],
      queue: queue ? JSON.parse(queue.toString()) : [],
      generatedAt: index
        ? JSON.parse(index.toString()).generatedAt
        : undefined,
    }
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(body))
    return
  }
  if (url.pathname === '/gaps.xlsx') {
    const x = read('data/gaps.xlsx')
    if (!x) {
      res.writeHead(404)
      res.end('No gaps.xlsx yet — run npm run score:jd -- --demo')
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
  if (url.pathname === '/queue.json') {
    const x = read('data/queue.json')
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(x || '[]')
    return
  }
  // SPA fallback from apps/dashboard/dist
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
      <p>UI not built yet. Run <code>npm run build:ui</code> or <code>npm run dev</code>.</p>
      <p><a href="/api/state">/api/state</a> · <a href="/gaps.xlsx">gaps.xlsx</a></p>
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
