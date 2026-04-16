import type { DmxBackend } from './types'

const createUniverseFrame = () => new Uint8Array(512)

export class SimulatorBackend implements DmxBackend {
  readonly name = 'simulator' as const
  private readonly observedUniverses = new Map<number, Uint8Array>()

  async initialize() {
    return
  }

  async shutdown() {
    return
  }

  async writeUniverse(universe: number, frame: Uint8Array) {
    const next = createUniverseFrame()
    next.set(frame.slice(0, 512))
    this.observedUniverses.set(universe, next)
  }

  async readObservedUniverse(universe: number) {
    return this.observedUniverses.get(universe) ?? createUniverseFrame()
  }
}
