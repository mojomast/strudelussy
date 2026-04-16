import { z } from 'zod'
import type { Env } from '../../index'
import { findProjectAcrossUsers, listAllProjectsForMcp, mcpText, saveProjectForMcp, saveSnapshotVersion, type MinimalMcpToolServer } from './shared'

const loadProjectSchema = z.object({ project_id: z.string() })
const saveSnapshotSchema = z.object({
  project_id: z.string(),
  label: z.string().optional().describe('Human label for this snapshot'),
})

export const registerProjectTools = (server: MinimalMcpToolServer, env: Env) => {
  server.registerTool('list_projects', {
    description: 'List all saved projects with their IDs, names, and last-modified timestamps.',
    inputSchema: z.object({}),
  },
    async () => {
      const projects = await listAllProjectsForMcp(env)
      return mcpText(JSON.stringify(projects.map((project) => ({
        id: project.id,
        user_id: project.user_id,
        name: project.name,
        updated_at: project.updated_at,
      }))))
    })

  server.registerTool('load_project', {
    description: 'Load a project by ID and return its code and metadata.',
    inputSchema: loadProjectSchema,
  },
    async ({ project_id }) => {
      const project = await findProjectAcrossUsers(env, project_id)
      if (!project) {
        return mcpText('Project not found.', true)
      }

      return mcpText(JSON.stringify(project))
    })

  server.registerTool('save_snapshot', {
    description: 'Save a named snapshot of the current pattern to the version history.',
    inputSchema: saveSnapshotSchema,
  },
    async ({ project_id, label }) => {
      const project = await findProjectAcrossUsers(env, project_id)
      if (!project) {
        return mcpText('Project not found.', true)
      }

      const version = await saveSnapshotVersion(project, label)
      const updatedProject = {
        ...project,
        versions: [version, ...project.versions],
        updated_at: new Date().toISOString(),
      }

      await saveProjectForMcp(env, updatedProject)
      return mcpText(JSON.stringify({ success: true, project_id, version }))
    })
}
