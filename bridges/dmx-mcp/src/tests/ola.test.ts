import { describe, expect, it, vi } from 'vitest'
import { OlaBackend } from '../backends/ola'

describe('OlaBackend', () => {
  it('posts universe frames to set_dmx', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 200 })
    const backend = new OlaBackend({ baseUrl: 'http://127.0.0.1:9090', fetchImpl })

    await backend.writeUniverse(1, new Uint8Array([0, 10, 255]))

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/set_dmx')
    expect(init.method).toBe('POST')
    expect(String(init.body)).toContain('u=1')
    expect(String(init.body)).toContain('d=0%2C10%2C255')
  })

  it('reads observed universe frames from get_dmx', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ dmx: [5, 15, 25] }),
    })
    const backend = new OlaBackend({ baseUrl: 'http://127.0.0.1:9090', fetchImpl })

    const observed = await backend.readObservedUniverse(1)

    expect(fetchImpl).toHaveBeenCalledWith('http://127.0.0.1:9090/get_dmx?u=1')
    expect(Array.from(observed?.slice(0, 3) ?? [])).toEqual([5, 15, 25])
  })
})
