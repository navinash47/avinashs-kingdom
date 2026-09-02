/**
 * True when viewing via Cloudflare quick tunnel (friend / public read-only view).
 */
export function isShareHost(hostname = window.location.hostname) {
  return hostname.endsWith('.trycloudflare.com') || hostname.endsWith('.cloudflare.com')
}

/** Direct local dashboard URL (not /embed — that breaks dashboard /api calls). */
export function dashboardOpenUrl(port: number) {
  return `http://127.0.0.1:${port}/`
}
