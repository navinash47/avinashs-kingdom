/**
 * Legacy share-host helpers (guest Cloudflare UI removed).
 * dashboardOpenUrl lives in orchestratorApi — kept here for any leftover imports.
 */
export function isShareHost(_hostname = typeof window !== 'undefined' ? window.location.hostname : '') {
  return false
}

export function dashboardOpenUrl(port: number) {
  return `http://127.0.0.1:${port}/`
}
