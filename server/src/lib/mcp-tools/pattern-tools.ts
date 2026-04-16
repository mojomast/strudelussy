import { z } from 'zod'
import type { Env } from '../../index'
import { loadMcpPatternRecord, mcpText, sanitizePatternInput, saveMcpPatternRecord, type MinimalMcpToolServer } from './shared'

const mutationSchema = z.enum(['reverse', 'scramble', 'double_speed', 'half_speed', 'humanize'])
const writePatternSchema = z.object({
  code: z.string().describe('Valid Strudel mini-notation code'),
  project_id: z.string().optional().describe('Project ID; defaults to scratch'),
})
const projectIdSchema = z.object({ project_id: z.string().optional() })
const mutatePatternSchema = z.object({
  mutation: mutationSchema,
  project_id: z.string().optional(),
})
const injectSectionSchema = z.object({
  section_name: z.string(),
  code: z.string(),
  mode: z.enum(['append', 'replace']).default('replace'),
  project_id: z.string().optional(),
})

export const reversePattern = (code: string) => code.split('\n').map((line) => line.split('').reverse().join('')).join('\n')
export const scramblePattern = (code: string) => code.split('\n').map((line) => line.split(' ').reverse().join(' ')).join('\n')
export const doubleSpeedPattern = (code: string) => code.includes('fast(') ? code : `${code}\n.fast(2)`
export const halfSpeedPattern = (code: string) => code.includes('slow(') ? code : `${code}\n.slow(2)`
export const humanizePattern = (code: string) => code.includes('.swing(') ? code : `${code}\n.swing(0.03)`

export const replaceSection = (source: string, sectionName: string, nextCode: string) => {
  const marker = `// [${sectionName}]`
  const escapedMarker = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = new RegExp(`(^${escapedMarker}\\n[\\s\\S]*?)(?=^// \[[^\]]+\]|$)`, 'm')

  if (!pattern.test(source)) {
    return `${source.trimEnd()}\n\n${marker}\n${nextCode.trim()}\n`
  }

  return source.replace(pattern, `${marker}\n${nextCode.trim()}\n`)
}

export const registerPatternTools = (server: MinimalMcpToolServer, env: Env) => {
  server.registerTool('write_pattern', {
    description: 'Write Strudel code to the active project editor. Replaces the full pattern.',
    inputSchema: writePatternSchema,
  },
    async ({ code, project_id }) => {
      const sanitized = sanitizePatternInput(code)
      if ('error' in sanitized) {
        return mcpText(sanitized.error, true)
      }

      const record = await saveMcpPatternRecord(env, project_id, sanitized.code)
      return mcpText(JSON.stringify({ success: true, project_id: record.project_id, code: record.code }))
    })

  server.registerTool('get_pattern', {
    description: 'Get the current Strudel code for a project.',
    inputSchema: projectIdSchema,
  },
    async ({ project_id }) => {
      const record = await loadMcpPatternRecord(env, project_id)
      return mcpText(JSON.stringify({ project_id: project_id ?? 'scratch', code: record?.code ?? '' }))
    })

  server.registerTool('mutate_pattern', {
    description: 'Apply a mutation to the current pattern: reverse, scramble, double, half, humanize.',
    inputSchema: mutatePatternSchema,
  },
    async ({ mutation, project_id }) => {
      const current = await loadMcpPatternRecord(env, project_id)
      const code = current?.code ?? ''
      if (!code) {
        return mcpText('No MCP pattern exists for this project yet.', true)
      }

      const nextCode = (() => {
        switch (mutation) {
          case 'reverse': return reversePattern(code)
          case 'scramble': return scramblePattern(code)
          case 'double_speed': return doubleSpeedPattern(code)
          case 'half_speed': return halfSpeedPattern(code)
          case 'humanize': return humanizePattern(code)
          default: return code
        }
      })()

      const record = await saveMcpPatternRecord(env, project_id, nextCode)
      return mcpText(JSON.stringify({ success: true, mutation, project_id: record.project_id, code: record.code }))
    })

  server.registerTool('inject_section', {
    description: 'Insert or replace a named section comment block in the current code.',
    inputSchema: injectSectionSchema,
  },
    async ({ section_name, code, mode, project_id }) => {
      const sanitized = sanitizePatternInput(code)
      if ('error' in sanitized) {
        return mcpText(sanitized.error, true)
      }

      const current = await loadMcpPatternRecord(env, project_id)
      const currentCode = current?.code ?? ''
      const nextCode = mode === 'append'
        ? `${currentCode.trimEnd()}\n\n// [${section_name}]\n${sanitized.code}\n`
        : replaceSection(currentCode, section_name, sanitized.code)

      const record = await saveMcpPatternRecord(env, project_id, nextCode.trim())
      return mcpText(JSON.stringify({ success: true, mode, section_name, project_id: record.project_id, code: record.code }))
    })
}
