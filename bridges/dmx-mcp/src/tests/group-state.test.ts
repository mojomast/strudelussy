import { describe, expect, it, vi } from 'vitest'
import { SimulatorBackend } from '../backends/simulator'
import { loadConfig } from '../config'
import { DmxBridgeService } from '../service'
import { registerControlTools } from '../tools/control'

describe('group state', () => {
  it('sets group dimmer state on the configured patch', async () => {
    const service = new DmxBridgeService(loadConfig({}), new SimulatorBackend())
    await service.initialize()

    const receipt = await service.setGroupState('all_washes', { intensity: 200 }, 'group-1', false)
    const observed = await service.getObservedUniverse(1)

    expect(receipt.group_id).toBe('all_washes')
    expect(observed.channels[0]).toBe(200)
    expect(observed.channels[5]).toBe(200)
  })

  it('preserves unrelated desired channels when updating a group', async () => {
    const service = new DmxBridgeService(loadConfig({}), new SimulatorBackend())
    await service.initialize()

    await service.applyScene('pulse_blue', 'scene-1', false)
    await service.setGroupState('frontline', { intensity: 90 }, 'group-2', false)
    const desired = await service.getDesiredUniverse(1)

    expect(desired.channels[3]).toBe(200)
    expect(desired.channels[8]).toBe(200)
    expect(desired.channels[0]).toBe(90)
    expect(desired.channels[5]).toBe(90)
  })

  it('skips unsupported color channels for fixtures without that personality key', async () => {
    const config = loadConfig({
      DMX_PATCH_PATH: new URL('../../config/patch.json', import.meta.url).pathname,
    })
    const service = new DmxBridgeService(config, new SimulatorBackend())
    await service.initialize()

    const patch = service.getPatch()
    patch.fixtures[0] = {
      ...patch.fixtures[0],
      personality: { dimmer: 1 },
    } as typeof patch.fixtures[number]

    await service.setGroupState('frontline', { intensity: 120, blue: 200 }, 'group-3', false)
    const desired = await service.getDesiredUniverse(1)

    expect(desired.channels[0]).toBe(120)
    expect(desired.channels[3]).toBe(0)
    expect(desired.channels[5]).toBe(120)
    expect(desired.channels[8]).toBe(200)
  })

  it('registers a list_groups MCP tool that returns patch groups', async () => {
    const service = new DmxBridgeService(loadConfig({}), new SimulatorBackend())
    await service.initialize()

    const registerTool = vi.fn()
    registerControlTools({ registerTool } as never, service)

    const listGroupsCall = registerTool.mock.calls.find(([name]) => name === 'list_groups')
    expect(listGroupsCall).toBeTruthy()

    const handler = listGroupsCall?.[2] as (() => Promise<{ content: Array<{ text: string }> }>)
    const result = await handler()
    const payload = JSON.parse(result.content[0]?.text ?? '{}') as { groups?: Array<{ id: string }> }

    expect(payload.groups?.map((group) => group.id)).toEqual(['all_washes', 'frontline'])
  })
})
