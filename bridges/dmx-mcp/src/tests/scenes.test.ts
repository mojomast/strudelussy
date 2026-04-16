import { describe, expect, it } from 'vitest'
import { SimulatorBackend } from '../backends/simulator'
import { loadConfig } from '../config'
import { DmxBridgeService } from '../service'

describe('demo scenes', () => {
  it('lists built-in scenes', async () => {
    const service = new DmxBridgeService(loadConfig({}), new SimulatorBackend())
    await service.initialize()

    const scenes = service.listScenes()
    expect(scenes.length).toBeGreaterThan(0)
    expect(scenes[0]).toHaveProperty('id')
    expect(scenes[0]).toHaveProperty('label')
    expect(scenes[0]).toHaveProperty('target_group_id')
  })

  it('applies a built-in scene and updates observed universe state', async () => {
    const service = new DmxBridgeService(loadConfig({}), new SimulatorBackend())
    await service.initialize()

    const receipt = await service.applyScene('pulse_blue', 'scene-1', false)
    const observed = await service.getObservedUniverse(1)

    expect(receipt.scene_id).toBe('pulse_blue')
    expect(observed.channels.slice(0, 5)).toEqual([180, 0, 0, 200, 0])
    expect(observed.channels.slice(5, 10)).toEqual([180, 0, 0, 200, 0])
  })
})
