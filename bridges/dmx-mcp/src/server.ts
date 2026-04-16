import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { OlaBackend } from './backends/ola'
import { SimulatorBackend } from './backends/simulator'
import type { DmxBackend } from './backends/types'
import { loadConfig } from './config'
import { registerResources } from './resources'
import { DmxBridgeService } from './service'
import { registerControlTools } from './tools/control'

const createBackend = (config: ReturnType<typeof loadConfig>): DmxBackend => {
  const backendName = config.backend
  switch (backendName) {
    case 'simulator':
      return new SimulatorBackend()
    case 'ola':
      return new OlaBackend({ baseUrl: config.olaBaseUrl })
    case 'sacn':
    case 'artnet':
      throw new Error(`Backend ${backendName} is not implemented yet.`)
    default:
      throw new Error(`Unknown backend ${backendName satisfies never}.`)
  }
}

export const createBridgeServer = async () => {
  const config = loadConfig()
  const backend = createBackend(config)
  const service = new DmxBridgeService(config, backend)
  await service.initialize()
  const server = new McpServer({ name: 'dmx-mcp', version: '0.0.1' })

  registerControlTools(server, service)
  registerResources(server, service)

  return { server, service, backend, config }
}
