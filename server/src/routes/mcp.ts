import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPTransport } from '@hono/mcp'
import type { Context } from 'hono'
import type { Env } from '../index'
import { registerPatternTools } from '../lib/mcp-tools/pattern-tools'
import { registerProjectTools } from '../lib/mcp-tools/project-tools'
import { registerResources } from '../lib/mcp-tools/resources'
import { registerTransportTools } from '../lib/mcp-tools/transport-tools'

export const buildMcpServer = (env: Env) => {
  const server = new McpServer({ name: 'shoedelussy', version: '0.1.0' })
  registerPatternTools(server, env)
  registerProjectTools(server, env)
  registerTransportTools(server, env)
  registerResources(server, env)
  return server
}

export const buildMcpHandler = async (c: Context<{ Bindings: Env }>) => {
  const env = c.env
  const server = buildMcpServer(env)
  const transport = new StreamableHTTPTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  })

  await server.connect(transport)
  return transport.handleRequest(c)
}
