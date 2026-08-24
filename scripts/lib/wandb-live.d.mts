export function resetWandbLiveCache(): void
export function wandbSecretsFromDisk(opts?: {
  env?: NodeJS.ProcessEnv
  paths?: string[]
  cwd?: string
  home?: string
}): {
  apiKey: string
  entity: string
  project: string
}
export function fetchFreshWandbRun(opts?: {
  apiKey?: string
  entity?: string
  project?: string
  fetchImpl?: typeof fetch
  now?: number
  skipCache?: boolean
}): Promise<{
  url?: string
  entity?: string
  project?: string
  state?: string
  heartbeatAt?: string
  name?: string
} | null>
export function mergeFileAndWandb(
  fileStatus: Record<string, unknown> | null,
  wandbRun: Record<string, unknown> | null | undefined,
  opts?: { now?: number },
): Record<string, unknown> | null
