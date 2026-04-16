import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import type { DmxMcpConfig } from './config'
import { DmxBridgeService } from './service'

const readBody = (req: IncomingMessage) => new Promise<string>((resolve, reject) => {
  let body = ''
  req.on('data', (chunk: Buffer | string) => {
    body += String(chunk)
  })
  req.on('end', () => resolve(body))
  req.on('error', reject)
})

const writeJson = (res: ServerResponse, status: number, payload: unknown) => {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.end(JSON.stringify(payload))
}

export const startHttpServer = (service: DmxBridgeService, config: DmxMcpConfig): Promise<Server> => new Promise((resolve, reject) => {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', `http://${config.host}:${config.port}`)

      if (req.method === 'OPTIONS') {
        res.statusCode = 204
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
        res.end()
        return
      }

      if (url.pathname === '/health') {
        writeJson(res, 200, { ok: true, ...service.getConnectionStatus() })
        return
      }

      if (url.pathname === '/state') {
        writeJson(res, 200, await service.getVisualizationState())
        return
      }

      if (url.pathname === '/patch' && req.method === 'GET') {
        writeJson(res, 200, service.getPatch())
        return
      }

      if (url.pathname === '/scenes' && req.method === 'GET') {
        writeJson(res, 200, { scenes: service.listScenes() })
        return
      }

      if (url.pathname === '/scenes/apply' && req.method === 'POST') {
        const rawBody = await readBody(req)
        const payload = rawBody ? JSON.parse(rawBody) as { scene_id?: string } : {}
        if (!payload.scene_id) {
          writeJson(res, 400, { error: 'scene_id is required' })
          return
        }

        const receipt = await service.applyScene(payload.scene_id, `http-${Date.now()}`, false)
        writeJson(res, 200, receipt)
        return
      }

      if (url.pathname === '/control/arm' && req.method === 'POST') {
        writeJson(res, 200, await service.arm(`http-arm-${Date.now()}`, false))
        return
      }

      if (url.pathname === '/control/disarm' && req.method === 'POST') {
        writeJson(res, 200, await service.disarm(`http-disarm-${Date.now()}`, false))
        return
      }

      if (url.pathname === '/control/blackout' && req.method === 'POST') {
        writeJson(res, 200, await service.blackout(`http-blackout-${Date.now()}`, false))
        return
      }

      if (url.pathname === '/control/group' && req.method === 'POST') {
        const rawBody = await readBody(req)
        const payload = rawBody
          ? JSON.parse(rawBody) as {
              group_id?: string
              intensity?: number
              red?: number
              green?: number
              blue?: number
              white?: number
            }
          : {}
        if (!payload.group_id) {
          writeJson(res, 400, { error: 'group_id is required' })
          return
        }

        const receipt = await service.setGroupState(
          payload.group_id,
          {
            intensity: payload.intensity,
            red: payload.red,
            green: payload.green,
            blue: payload.blue,
            white: payload.white,
          },
          `http-group-${Date.now()}`,
          false,
        )
        writeJson(res, 200, receipt)
        return
      }

      writeJson(res, 404, { error: 'Not found' })
    } catch (error) {
      writeJson(res, 500, { error: error instanceof Error ? error.message : 'Internal server error' })
    }
  })

  server.once('error', reject)
  server.listen(config.port, config.host, () => resolve(server))
})
