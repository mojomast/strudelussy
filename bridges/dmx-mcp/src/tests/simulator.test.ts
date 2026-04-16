import { describe, expect, it } from 'vitest'
import { loadConfig } from '../config'
import { DmxStateStore } from '../state'
import { SimulatorBackend } from '../backends/simulator'

describe('dmx-mcp simulator state', () => {
  it('starts disarmed with default capabilities', () => {
    const config = loadConfig({})
    const state = new DmxStateStore(config, 'simulator')

    expect(state.isArmed()).toBe(false)
    expect(state.getCapabilities().backend).toBe('simulator')
    expect(state.getCapabilities().allowedUniverses).toEqual([1])
  })

  it('arm and disarm are idempotent with identical keys', () => {
    const config = loadConfig({})
    const state = new DmxStateStore(config, 'simulator')

    const first = state.arm('arm-1', false)
    const second = state.arm('arm-1', false)

    expect(first).toEqual(second)
    expect(state.isArmed()).toBe(true)

    state.disarm('disarm-1', false)
    expect(state.isArmed()).toBe(false)
  })

  it('rejects idempotency key reuse with different params', () => {
    const config = loadConfig({})
    const state = new DmxStateStore(config, 'simulator')

    state.arm('key-1', false)

    expect(() => state.arm('key-1', true)).toThrow(/different parameters/i)
  })

  it('blackout zeroes desired and observed state', () => {
    const config = loadConfig({})
    const state = new DmxStateStore(config, 'simulator')

    state.recordDesiredWrite(1, new Uint8Array([255, 120, 0]))
    state.applyObservedWrite(1, new Uint8Array([255, 120, 0]))
    state.blackout('blackout-1', false)

    expect(state.getDesiredUniverse(1).channels.slice(0, 3)).toEqual([0, 0, 0])
    expect(state.getObservedUniverse(1).channels.slice(0, 3)).toEqual([0, 0, 0])
  })
})

describe('simulator backend', () => {
  it('stores observed universe frames', async () => {
    const backend = new SimulatorBackend()
    await backend.initialize()
    await backend.writeUniverse(1, new Uint8Array([10, 20, 30]))
    const observed = await backend.readObservedUniverse(1)

    expect(Array.from(observed?.slice(0, 3) ?? [])).toEqual([10, 20, 30])
  })
})
