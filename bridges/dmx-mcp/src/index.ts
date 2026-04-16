import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { createBridgeServer } from './server'
import { startHttpServer } from './http'

const main = async () => {
  const { server, service, config } = await createBridgeServer()
  await startHttpServer(service, config)
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

void main()
