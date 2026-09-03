/** Display-safe progress percent for bars/labels (guards sync parse bugs). */
export function clampProgress(value: number | null | undefined): number {
  if (value == null || !Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function formatProgress(value: number | null | undefined): string {
  return `${clampProgress(value)}%`
}
