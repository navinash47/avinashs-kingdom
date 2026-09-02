/**
 * Reverse-proxy /embed/:port/* → http://127.0.0.1:port/*
 * Rewrites HTML so absolute asset paths work inside the orchestrator iframe.
 */
import http from 'node:http'

const EMBED_RE = /^\/embed\/(\d+)(\/.*)?$/

function rewriteHtml(html, port) {
  const prefix = `/embed/${port}`
  const base = `<base href="${prefix}/">`
  let out = html
  if (/<head[^>]*>/i.test(out)) {
    out = out.replace(/<head([^>]*)>/i, `<head$1>${base}`)
  } else {
    out = base + out
  }
  out = out.replace(/\b(src|href)=(["'])\/(?!\/|embed\/)/gi, `$1=$2${prefix}/`)
  return out
}

function pickHeaders(upstream) {
  const skip = new Set([
    'transfer-encoding',
    'connection',
    'keep-alive',
    'content-encoding',
    'content-length',
  ])
  const headers = {}
  for (const [k, v] of Object.entries(upstream.headers)) {
    if (v == null || skip.has(k.toLowerCase())) continue
    headers[k] = v
  }
  headers['x-frame-options'] = 'SAMEORIGIN'
  return headers
}

export function createEmbedProxyMiddleware() {
  return (req, res, next) => {
    const rawUrl = req.url ?? '/'
    const pathOnly = rawUrl.split('?')[0] ?? '/'
    const m = pathOnly.match(EMBED_RE)
    if (!m) return next()

    const port = Number(m[1])
    const rest = m[2] || '/'
    const qs = rawUrl.includes('?') ? rawUrl.slice(rawUrl.indexOf('?')) : ''
    const targetPath = `${rest}${rest.includes('?') ? '' : qs}`

    const proxyReq = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: targetPath,
        method: req.method,
        headers: {
          ...req.headers,
          host: `127.0.0.1:${port}`,
        },
      },
      (proxyRes) => {
        const chunks = []
        proxyRes.on('data', (c) => chunks.push(c))
        proxyRes.on('end', () => {
          let body = Buffer.concat(chunks)
          const ct = String(proxyRes.headers['content-type'] ?? '')
          const text = body.toString('utf8')
          if (ct.includes('text/html') || /^\s*<!DOCTYPE/i.test(text) || /^\s*<html/i.test(text)) {
            body = Buffer.from(rewriteHtml(text, port), 'utf8')
          }
          res.writeHead(proxyRes.statusCode ?? 502, pickHeaders(proxyRes))
          res.end(body)
        })
      },
    )

    proxyReq.on('error', () => {
      if (!res.headersSent) {
        res.statusCode = 502
        res.end('Dashboard not reachable — is it started?')
      }
    })

    if (req.method === 'GET' || req.method === 'HEAD') {
      proxyReq.end()
    } else {
      req.pipe(proxyReq)
    }
  }
}

export function buildShareUrlJson(results, stamp) {
  const byPort = {}
  const byName = {}
  let kingdomUrl = ''
  for (const row of results) {
    const [name, port, , url] = row.split('|')
    if (!isGuestTunnelUrl(url)) continue
    byPort[port] = url
    byName[name] = url
    if (name === 'kingdom') kingdomUrl = url
  }
  return {
    url: kingdomUrl,
    services: byPort,
    by_name: byName,
    updated_at: stamp,
    note: 'Open url only. Iframes use real per-service tunnel URLs.',
  }
}

/** Real trycloudflare guest host — never api.trycloudflare.com. */
export function isGuestTunnelUrl(url) {
  if (!url || typeof url !== 'string') return false
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:') return false
    if (!u.hostname.endsWith('.trycloudflare.com')) return false
    if (u.hostname === 'api.trycloudflare.com') return false
    return true
  } catch {
    return false
  }
}
