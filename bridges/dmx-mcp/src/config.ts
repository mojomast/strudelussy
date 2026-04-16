import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
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

const loadDotEnvFile = (filePath: string) => {
  if (!existsSync(filePath)) {
    return {}
  }

  const raw = readFileSync(filePath, 'utf8')
  const entries = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const separatorIndex = line.indexOf('=')
      if (separatorIndex < 0) {
        return null
      }

      const key = line.slice(0, separatorIndex).trim()
      const value = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '')
      return key ? [key, value] : null
    })
    .filter((entry): entry is [string, string] => entry !== null)

  return Object.fromEntries(entries)
}

export const loadConfig = (env: NodeJS.ProcessEnv = process.env): DmxMcpConfig => {
  const mergedEnv = env === process.env
    ? { ...loadDotEnvFile(resolve(process.cwd(), '.env')), ...process.env }
    : env

  return {
    host: mergedEnv.DMX_MCP_HOST ?? '127.0.0.1',
    port: parseNumber(mergedEnv.DMX_MCP_PORT, 3334),
    olaBaseUrl: mergedEnv.OLA_BASE_URL ?? 'http://127.0.0.1:9090',
    patchPath: mergedEnv.DMX_PATCH_PATH ?? new URL('../config/patch.json', import.meta.url).pathname,
    backend: parseBackend(mergedEnv.DMX_BACKEND),
    safeMode: parseBoolean(mergedEnv.DMX_SAFE_MODE, true),
    outputArmed: parseBoolean(mergedEnv.DMX_OUTPUT_ARMED, false),
    allowedUniverses: parseUniverses(mergedEnv.DMX_ALLOWED_UNIVERSES),
    maxFps: Math.max(1, parseNumber(mergedEnv.DMX_MAX_FPS, 30)),
  }
}
