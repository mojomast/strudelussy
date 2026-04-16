import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { DmxBridgeService } from './service'

const asResource = (uri: string, payload: unknown) => ({
  contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(payload) }],
})

export const registerResources = (server: McpServer, service: DmxBridgeService) => {
  server.registerResource('dmx-capabilities', 'dmx://capabilities', {}, async (uri) => asResource(uri.href, service.getCapabilities()))
  server.registerResource('dmx-backend', 'dmx://backends/current', {}, async (uri) => asResource(uri.href, service.getBackendStatus()))
  server.registerResource('dmx-patch', 'dmx://patch', {}, async (uri) => asResource(uri.href, service.getPatch()))
  server.registerResource('dmx-scenes', 'dmx://scenes', {}, async (uri) => asResource(uri.href, { scenes: service.listScenes() }))
  server.registerResource(
    'dmx-desired-universe',
    new ResourceTemplate('dmx://universes/{id}/desired', { list: undefined }),
    {},
    async (uri, variables) => {
      const universe = Number.parseInt(String(variables.id), 10)
      return asResource(uri.href, await service.getDesiredUniverse(universe))
    },
  )
  server.registerResource(
    'dmx-observed-universe',
    new ResourceTemplate('dmx://universes/{id}/observed', { list: undefined }),
    {},
    async (uri, variables) => {
      const universe = Number.parseInt(String(variables.id), 10)
      return asResource(uri.href, await service.getObservedUniverse(universe))
    },
  )
}
