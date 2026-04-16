import { spawn, type ChildProcess } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'

const BASE_URL = 'http://127.0.0.1:3334'
const HEALTH_TIMEOUT_MS = 10_000
const HEALTH_INTERVAL_MS = 200

const postJson = async (path: string, body?: Record<string, unknown>) => {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    throw new Error(`${path} failed with status ${response.status}`)
  }

  return response.json()
}

const waitForHealth = async () => {
  const startedAt = Date.now()

  while (Date.now() - startedAt < HEALTH_TIMEOUT_MS) {
    try {
      const response = await fetch(`${BASE_URL}/health`)
      if (response.ok) {
        return
      }
    } catch {
      // Bridge not ready yet.
    }

    await delay(HEALTH_INTERVAL_MS)
  }

  throw new Error(`Bridge did not become healthy within ${HEALTH_TIMEOUT_MS}ms`)
}

const startBridge = () => spawn('pnpm', ['tsx', 'src/index.ts'], {
  cwd: new URL('..', import.meta.url),
  env: {
    ...process.env,
    DMX_BACKEND: 'simulator',
    DMX_OUTPUT_ARMED: 'false',
  },
  stdio: 'inherit',
})

const stopBridge = async (child: ChildProcess | null) => {
  if (!child || child.killed) {
    return
  }

  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      if (!child.killed) {
        child.kill('SIGKILL')
      }
    }, 2_000)

    child.once('exit', () => {
      clearTimeout(timeout)
      resolve()
    })

    child.kill('SIGTERM')
  })
}

const main = async () => {
  let child: ChildProcess | null = null

  try {
    child = startBridge()
    await waitForHealth()

    await postJson('/control/arm', { idempotency_key: 'smoke-arm' })
    await postJson('/scenes/apply', { scene_id: 'full_white', idempotency_key: 'smoke-scene' })

    const litStateResponse = await fetch(`${BASE_URL}/state`)
    if (!litStateResponse.ok) {
      throw new Error(`/state failed with status ${litStateResponse.status} after scene apply`)
    }
    const litState = await litStateResponse.json() as { universe?: { channels?: number[] } }
    const litChannel = litState.universe?.channels?.[0] ?? 0
    if (litChannel <= 0) {
      throw new Error(`Expected channel 1 to be lit after full_white scene, got ${litChannel}`)
    }

    await postJson('/control/blackout', { idempotency_key: 'smoke-blackout' })

    const darkStateResponse = await fetch(`${BASE_URL}/state`)
    if (!darkStateResponse.ok) {
      throw new Error(`/state failed with status ${darkStateResponse.status} after blackout`)
    }
    const darkState = await darkStateResponse.json() as { universe?: { channels?: number[] } }
    const darkChannel = darkState.universe?.channels?.[0] ?? -1
    if (darkChannel !== 0) {
      throw new Error(`Expected channel 1 to be dark after blackout, got ${darkChannel}`)
    }

    console.log('PASS smoke test: bridge started, scene lit channel 1, blackout cleared channel 1')
    process.exitCode = 0
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown smoke test failure'
    console.error(`FAIL smoke test: ${message}`)
    process.exitCode = 1
  } finally {
    await stopBridge(child)
  }
}

void main()
