import { describe, expect, it } from 'vitest'
import app, { type Env } from '../index'

const createKv = () => {
  const store = new Map<string, string>()
  return {
    get: async (key: string) => store.get(key) ?? null,
    put: async (key: string, value: string) => { store.set(key, value) },
    delete: async (key: string) => { store.delete(key) },
    list: async ({ prefix }: { prefix?: string } = {}) => ({
      keys: Array.from(store.keys()).filter((key) => !prefix || key.startsWith(prefix)).map((name) => ({ name })),
      list_complete: true,
      cursor: '',
    }),
  } as unknown as KVNamespace
}

const createEnv = (secret?: string): Env => ({
  OPENROUTER_API_KEY: 'test',
  OPENROUTER_MODEL: 'test-model',
  APP_URL: 'http://localhost:5173',
  MCP_SECRET: secret,
  NODE_ENV: 'test',
  SHARES_KV: createKv(),
  PROJECTS_KV: createKv(),
})

describe('/mcp route', () => {
  it('returns 401 without auth when MCP_SECRET is set', async () => {
    const env = createEnv('secret')
    const response = await app.request('/mcp', { method: 'POST' }, env)
    expect(response.status).toBe(401)
  })
})
