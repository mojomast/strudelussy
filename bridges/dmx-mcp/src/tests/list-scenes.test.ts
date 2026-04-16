import { describe, expect, it } from 'vitest'
import { SimulatorBackend } from '../backends/simulator'
import { loadConfig } from '../config'
import { DmxBridgeService } from '../service'

describe('scene and patch metadata', () => {
  it('returns scenes with target groups', () => {
    const service = new DmxBridgeService(loadConfig({}), new SimulatorBackend())
    const scenes = service.listScenes()

    expect(scenes.length).toBeGreaterThan(0)
    expect(scenes[0]).toHaveProperty('target_group_id')
  })

  it('returns the default patch model', () => {
    const service = new DmxBridgeService(loadConfig({}), new SimulatorBackend())
    const patch = service.getPatch()

    expect(patch.universe).toBe(1)
    expect(patch.fixtures.length).toBeGreaterThan(0)
    expect(patch.groups.length).toBeGreaterThan(0)
  })
})
