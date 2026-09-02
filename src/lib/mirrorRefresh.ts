/** Fired when host syncs or guest clicks Refresh mirror — remount iframes + reload seed. */
export const MIRROR_REFRESH_EVENT = 'kingdom-mirror-refresh'

export function bumpMirrorRefresh(at = Date.now()) {
  window.dispatchEvent(new CustomEvent(MIRROR_REFRESH_EVENT, { detail: { at } }))
}
