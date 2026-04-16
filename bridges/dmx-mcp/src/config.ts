import type { BackendName } from './backends/types'

export interface DmxMcpConfig {
  host: string
  port: number
  olaBaseUrl: string
  patchPath: string
  backend: BackendName
  safeMode: boolean
  outputArmed: boolean
  allowedUniverses: number[]
  maxFps: number
}

const parseNumber = (value: string | undefined, fallback: number) => {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

const parseBoolean = (value: string | undefined, fallback: boolean) => {
  if (value === undefined) return fallback
  return value.toLowerCase() === 'true'
}

const parseBackend = (value: string | undefined): BackendName => {
  switch (value) {
    case 'ola':
    case 'sacn':
    case 'artnet':
    case 'simulator':
      return value
    default:
      return 'simulator'
  }
}

const parseUniverses = (value: string | undefined) => {
  if (!value) return [1]

  const parsed = value
    .split(',')
    .map((entry) => Number.parseInt(entry.trim(), 10))
    .filter((entry) => Number.isFinite(entry) && entry > 0)

  return parsed.length > 0 ? parsed : [1]
}

export const loadConfig = (env: NodeJS.ProcessEnv = process.env): DmxMcpConfig => ({
  host: env.DMX_MCP_HOST ?? '127.0.0.1',
  port: parseNumber(env.DMX_MCP_PORT, 3334),
  olaBaseUrl: env.OLA_BASE_URL ?? 'http://127.0.0.1:9090',
  patchPath: env.DMX_PATCH_PATH ?? new URL('../config/patch.json', import.meta.url).pathname,
  backend: parseBackend(env.DMX_BACKEND),
  safeMode: parseBoolean(env.DMX_SAFE_MODE, true),
  outputArmed: parseBoolean(env.DMX_OUTPUT_ARMED, false),
  allowedUniverses: parseUniverses(env.DMX_ALLOWED_UNIVERSES),
  maxFps: Math.max(1, parseNumber(env.DMX_MAX_FPS, 30)),
})
