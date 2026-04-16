import { describe, expect, it } from 'vitest'
import { saveSnapshotVersion } from './shared'

describe('project MCP helpers', () => {
  it('save_snapshot creates a version entry with label and ai provenance', async () => {
    const version = await saveSnapshotVersion({
      id: 'project-1',
      user_id: 'user-1',
      name: 'Demo',
      strudel_code: '$: s("bd sd")',
      chat_history: [],
      versions: [],
      tags: [],
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    }, 'snapshot')

    expect(version.label).toBe('snapshot')
    expect(version.created_by).toBe('ai')
    expect(version.code).toContain('bd sd')
  })
})
