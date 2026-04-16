import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { mcpText } from '../state'
import { DmxBridgeService } from '../service'

const toolSchema = {
  idempotency_key: z.string().min(1),
  dry_run: z.boolean().optional(),
}

const sceneToolSchema = {
  scene_id: z.string().min(1),
  idempotency_key: z.string().min(1),
  dry_run: z.boolean().optional(),
}

const groupStateSchema = {
  group_id: z.string().min(1),
  idempotency_key: z.string().min(1),
  dry_run: z.boolean().optional(),
  intensity: z.number().min(0).max(255).optional(),
  red: z.number().min(0).max(255).optional(),
  green: z.number().min(0).max(255).optional(),
  blue: z.number().min(0).max(255).optional(),
  white: z.number().min(0).max(255).optional(),
}

export const registerControlTools = (server: McpServer, service: DmxBridgeService) => {
  server.registerTool(
    'list_scenes',
    {
      description: 'Lists available built-in DMX scenes.',
    },
    async () => mcpText(JSON.stringify({ scenes: service.listScenes() })),
  )

  server.registerTool(
    'arm_output',
    {
      description: 'Arms DMX output for future non-simulated writes.',
      inputSchema: toolSchema,
    },
    async ({ idempotency_key, dry_run }) => {
      try {
        const receipt = await service.arm(idempotency_key, dry_run ?? false)
        return mcpText(JSON.stringify(receipt))
      } catch (error) {
        return mcpText(error instanceof Error ? error.message : 'Unable to arm output.', true)
      }
    },
  )

  server.registerTool(
    'disarm_output',
    {
      description: 'Disarms DMX output.',
      inputSchema: toolSchema,
    },
    async ({ idempotency_key, dry_run }) => {
      try {
        const receipt = await service.disarm(idempotency_key, dry_run ?? false)
        return mcpText(JSON.stringify(receipt))
      } catch (error) {
        return mcpText(error instanceof Error ? error.message : 'Unable to disarm output.', true)
      }
    },
  )

  server.registerTool(
    'blackout',
    {
      description: 'Immediately zeroes the desired DMX frame.',
      inputSchema: toolSchema,
    },
    async ({ idempotency_key, dry_run }) => {
      try {
        const receipt = await service.blackout(idempotency_key, dry_run ?? false)
        return mcpText(JSON.stringify(receipt))
      } catch (error) {
        return mcpText(error instanceof Error ? error.message : 'Unable to blackout output.', true)
      }
    },
  )

  server.registerTool(
    'apply_scene',
    {
      description: 'Applies one of the built-in demo scenes to universe 1.',
      inputSchema: sceneToolSchema,
    },
    async ({ scene_id, idempotency_key, dry_run }) => {
      try {
        const receipt = await service.applyScene(scene_id, idempotency_key, dry_run ?? false)
        return mcpText(JSON.stringify(receipt))
      } catch (error) {
        return mcpText(error instanceof Error ? error.message : 'Unable to apply scene.', true)
      }
    },
  )

  server.registerTool(
    'set_group_state',
    {
      description: 'Sets a named group state using intensity/RGBW values.',
      inputSchema: groupStateSchema,
    },
    async ({ group_id, idempotency_key, dry_run, intensity, red, green, blue, white }) => {
      try {
        const receipt = await service.setGroupState(
          group_id,
          { intensity, red, green, blue, white },
          idempotency_key,
          dry_run ?? false,
        )
        return mcpText(JSON.stringify(receipt))
      } catch (error) {
        return mcpText(error instanceof Error ? error.message : 'Unable to set group state.', true)
      }
    },
  )
}
