import type { DmxBackend } from './types'

interface OlaBackendOptions {
  baseUrl?: string
  fetchImpl?: typeof fetch
}

const createUniverseFrame = () => new Uint8Array(512)

const encodeFrame = (frame: Uint8Array) => Array.from(frame.slice(0, 512)).join(',')

export class OlaBackend implements DmxBackend {
  readonly name = 'ola' as const
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: OlaBackendOptions = {}) {
    this.baseUrl = options.baseUrl ?? 'http://127.0.0.1:9090'
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  async initialize() {
    return
  }

  async shutdown() {
    return
  }

  async writeUniverse(universe: number, frame: Uint8Array) {
    const response = await this.fetchImpl(`${this.baseUrl}/set_dmx`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
      body: new URLSearchParams({
        u: String(universe),
        d: encodeFrame(frame),
      }),
    })

    if (!response.ok) {
      throw new Error(`OLA set_dmx failed with status ${response.status}.`)
    }
  }

  async readObservedUniverse(universe: number) {
    const response = await this.fetchImpl(`${this.baseUrl}/get_dmx?u=${universe}`)
    if (!response.ok) {
      throw new Error(`OLA get_dmx failed with status ${response.status}.`)
    }

    const payload = await response.json() as { dmx?: number[] }
    const next = createUniverseFrame()
    const dmx = payload.dmx ?? []
    for (let index = 0; index < Math.min(dmx.length, next.length); index += 1) {
      const value = dmx[index] ?? 0
      next[index] = Math.max(0, Math.min(255, value))
    }
    return next
  }
}
