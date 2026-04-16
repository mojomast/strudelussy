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

const createEnv = (): Env => ({
  OPENROUTER_API_KEY: 'test',
  OPENROUTER_MODEL: 'test-model',
  APP_URL: 'http://localhost:5173',
  MCP_SECRET: 'secret',
  NODE_ENV: 'test',
  SHARES_KV: createKv(),
  PROJECTS_KV: createKv(),
})

describe('/api/projects lighting persistence', () => {
  it('creates and reads project lighting bindings', async () => {
    const env = createEnv()
    const createResponse = await app.request('/api/projects', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-user-id': 'user-1',
      },
      body: JSON.stringify({
        name: 'DMX Project',
        lighting: {
          cue_bindings: [{ section_label: 'intro', scene_id: 'full_white' }],
          group_bindings: [{ track_name: 'drums', group_id: 'all_washes', intensity: 200, hold_ms: 180, fade_ms: 40 }],
        },
      }),
    }, env)

    expect(createResponse.status).toBe(201)
    const created = await createResponse.json() as { id: string }

    const getResponse = await app.request(`/api/projects/${created.id}`, {
      method: 'GET',
      headers: { 'x-user-id': 'user-1' },
    }, env)

    expect(getResponse.status).toBe(200)
    const project = await getResponse.json() as { lighting: { group_bindings: Array<{ fade_ms?: number }> } }
    expect(project.lighting.group_bindings[0].fade_ms).toBe(40)
  })
})
