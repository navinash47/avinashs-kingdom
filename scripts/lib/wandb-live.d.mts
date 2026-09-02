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
export function entityForWandbFetch(
  secrets: { entity?: string | null } | null | undefined,
  fileStatus: { wandb_entity?: unknown } | null | undefined,
): string
export function parseWandbSummary(raw: unknown): Record<string, number>
export function parseWandbSampledHistory(
  raw: unknown,
): Array<{ iteration: number; mean_reward: number }>
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
  metrics?: Record<string, number>
  history?: Array<{ iteration: number; mean_reward: number }>
} | null>
export function mergeFileAndWandb(
  fileStatus: Record<string, unknown> | null,
  wandbRun: Record<string, unknown> | null | undefined,
  opts?: { now?: number },
): Record<string, unknown> | null
