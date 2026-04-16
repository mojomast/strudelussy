import { z } from 'zod'
import type { Env } from '../../index'
import { findProjectAcrossUsers, mcpText, saveProjectForMcp, type MinimalMcpToolServer } from './shared'

const projectIdSchema = z.object({ project_id: z.string().optional() })
const setBpmSchema = z.object({
  bpm: z.number().int().min(20).max(300),
  project_id: z.string().optional(),
})
const setKeySchema = z.object({
  key: z.string().describe('e.g. "C minor", "F# major"'),
  project_id: z.string().optional(),
})

export const parseBpmFromCode = (code: string): number | null => {
  const match = code.match(/setcpm\((\d+(?:\.\d+)?)\)/)
  if (!match) return null
  return Math.round(Number.parseFloat(match[1]) * 2)
}

export const countSections = (code: string) => (code.match(/^\/\/ \[[^\]]+\]/gm) ?? []).length

export const upsertSetcpm = (code: string, bpm: number) => {
  const setcpm = `setcpm(${(bpm / 2).toFixed(2).replace(/\.00$/, '')})`
  if (/setcpm\([^)]*\)/.test(code)) {
    return code.replace(/setcpm\([^)]*\)/, setcpm)
  }
  return `${setcpm}\n${code.trimStart()}`
}

export const registerTransportTools = (server: MinimalMcpToolServer, env: Env) => {
  server.registerTool('set_bpm', {
    description: 'Set the BPM for a project.',
    inputSchema: setBpmSchema,
  },
    async ({ bpm, project_id }) => {
      if (!project_id) {
        return mcpText('set_bpm requires a project_id.', true)
      }

      const project = await findProjectAcrossUsers(env, project_id)
      if (!project) {
        return mcpText('Project not found.', true)
      }

      const updatedProject = {
        ...project,
        strudel_code: upsertSetcpm(project.strudel_code, bpm),
        bpm,
        updated_at: new Date().toISOString(),
      }

      await saveProjectForMcp(env, updatedProject)
      return mcpText(JSON.stringify({ success: true, project_id, bpm }))
    })

  server.registerTool('set_key', {
    description: 'Set the musical key/scale context for AI generation hints.',
    inputSchema: setKeySchema,
  },
    async ({ key, project_id }) => {
      if (!project_id) {
        return mcpText('set_key requires a project_id.', true)
      }

      const project = await findProjectAcrossUsers(env, project_id)
      if (!project) {
        return mcpText('Project not found.', true)
      }

      await saveProjectForMcp(env, {
        ...project,
        key,
        updated_at: new Date().toISOString(),
      })

      return mcpText(JSON.stringify({ success: true, project_id, key }))
    })

  server.registerTool('get_state', {
    description: 'Get a summary of the current project state: pattern, BPM, key, section count.',
    inputSchema: projectIdSchema,
  },
    async ({ project_id }) => {
      if (!project_id) {
        return mcpText('get_state requires a project_id.', true)
      }

      const project = await findProjectAcrossUsers(env, project_id)
      if (!project) {
        return mcpText('Project not found.', true)
      }

      return mcpText(JSON.stringify({
        project_id,
        bpm: project.bpm ?? parseBpmFromCode(project.strudel_code),
        key: project.key ?? null,
        sectionCount: countSections(project.strudel_code),
        code: project.strudel_code,
      }))
    })
}
