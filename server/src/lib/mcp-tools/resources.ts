import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Env } from '../../index'
import { STRUDEL_DOCS } from '../strudel-docs'
import { findProjectAcrossUsers, listAllProjectsForMcp, mcpResource, type MinimalMcpResourceServer } from './shared'

export const registerResources = (server: MinimalMcpResourceServer, env: Env) => {
  server.registerResource('projects', 'projects://list', {}, async (uri) => {
    const projects = await listAllProjectsForMcp(env)
    return mcpResource(uri.href, 'application/json', JSON.stringify(projects))
  })

  server.registerResource(
    'project',
    new ResourceTemplate('projects://{id}', { list: undefined }),
    {},
    async (uri, { id }) => {
      const projectId = Array.isArray(id) ? id[0] : id
      const project = projectId ? await findProjectAcrossUsers(env, String(projectId)) : null
      return mcpResource(uri.href, 'application/json', JSON.stringify(project))
    },
  )

  server.registerResource('strudel-docs', 'docs://strudel', {}, async (uri) => mcpResource(uri.href, 'text/plain', STRUDEL_DOCS))
}
