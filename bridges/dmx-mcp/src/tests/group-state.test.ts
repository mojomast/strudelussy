import { describe, expect, it } from 'vitest'
import { SimulatorBackend } from '../backends/simulator'
import { loadConfig } from '../config'
import { DmxBridgeService } from '../service'

describe('group state', () => {
  it('sets group dimmer state on the configured patch', async () => {
    const service = new DmxBridgeService(loadConfig({}), new SimulatorBackend())
    await service.initialize()

    const receipt = await service.setGroupState('all_washes', { intensity: 200 }, 'group-1', false)
    const observed = await service.getObservedUniverse(1)

    expect(receipt.group_id).toBe('all_washes')
    expect(observed.channels[0]).toBe(200)
    expect(observed.channels[4]).toBe(200)
  })

  it('preserves unrelated desired channels when updating a group', async () => {
    const service = new DmxBridgeService(loadConfig({}), new SimulatorBackend())
    await service.initialize()

    await service.applyScene('pulse_blue', 'scene-1', false)
    await service.setGroupState('frontline', { intensity: 90 }, 'group-2', false)
    const desired = await service.getDesiredUniverse(1)

    expect(desired.channels[2]).toBe(255)
    expect(desired.channels[3]).toBe(180)
    expect(desired.channels[0]).toBe(90)
    expect(desired.channels[4]).toBe(90)
  })
})
