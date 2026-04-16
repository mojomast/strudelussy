import type { BackendName } from './backends/types'
import type { DmxMcpConfig } from './config'

export interface OperationReceipt {
  accepted: boolean
  operation_id: string
  backend: BackendName
  desired_revision: number
  dry_run: boolean
  safe_to_retry: boolean
}

interface IdempotentOperation {
  signature: string
  receipt: OperationReceipt
}

const createUniverseFrame = () => new Uint8Array(512)

const frameToArray = (frame: Uint8Array) => Array.from(frame)

export class DmxStateStore {
  private readonly desiredUniverses = new Map<number, Uint8Array>()
  private readonly observedUniverses = new Map<number, Uint8Array>()
  private readonly idempotentOperations = new Map<string, IdempotentOperation>()
  private desiredRevision = 0
  private armed: boolean
  private lastWriteAt = 0

  constructor(private readonly config: DmxMcpConfig, private readonly backend: BackendName) {
    this.armed = config.outputArmed
    for (const universe of config.allowedUniverses) {
      this.desiredUniverses.set(universe, createUniverseFrame())
      this.observedUniverses.set(universe, createUniverseFrame())
    }
  }

  getCapabilities() {
    return {
      backend: this.backend,
      allowedUniverses: [...this.config.allowedUniverses],
      maxFps: this.config.maxFps,
      safeMode: this.config.safeMode,
      supportsObservedReadback: this.backend === 'simulator',
      visualizationModes: ['hal', 'dmx'],
    }
  }

  getBackendStatus() {
    return {
      backend: this.backend,
      armed: this.armed,
      safeMode: this.config.safeMode,
      maxFps: this.config.maxFps,
      lastWriteAt: this.lastWriteAt > 0 ? new Date(this.lastWriteAt).toISOString() : null,
    }
  }

  getDesiredUniverse(universe: number) {
    return {
      universe,
      revision: this.desiredRevision,
      channels: frameToArray(this.getDesiredFrame(universe)),
      source: 'desired' as const,
    }
  }

  getObservedUniverse(universe: number) {
    return {
      universe,
      revision: this.desiredRevision,
      channels: frameToArray(this.getObservedFrame(universe)),
      source: 'observed' as const,
    }
  }

  isArmed() {
    return this.armed
  }

  arm(idempotencyKey: string, dryRun: boolean) {
    return this.commitOperation('arm', idempotencyKey, { dryRun }, () => {
      this.armed = true
    }, dryRun)
  }

  disarm(idempotencyKey: string, dryRun: boolean) {
    return this.commitOperation('disarm', idempotencyKey, { dryRun }, () => {
      this.armed = false
    }, dryRun)
  }

  blackout(idempotencyKey: string, dryRun: boolean) {
    return this.commitOperation('blackout', idempotencyKey, { dryRun }, () => {
      for (const universe of this.config.allowedUniverses) {
        this.desiredUniverses.set(universe, createUniverseFrame())
        this.observedUniverses.set(universe, createUniverseFrame())
      }
      this.lastWriteAt = Date.now()
    }, dryRun)
  }

  applyObservedWrite(universe: number, frame: Uint8Array) {
    this.assertUniverseAllowed(universe)
    this.observedUniverses.set(universe, new Uint8Array(frame))
    this.lastWriteAt = Date.now()
  }

  recordDesiredWrite(universe: number, frame: Uint8Array) {
    this.assertUniverseAllowed(universe)
    const next = this.clampFrame(frame)
    this.desiredUniverses.set(universe, next)
    this.desiredRevision += 1
    return this.desiredRevision
  }

  commitExternalOperation(operationName: string, idempotencyKey: string, payload: Record<string, unknown>) {
    const signature = JSON.stringify({ operationName, payload })
    const existing = this.idempotentOperations.get(idempotencyKey)
    if (existing) {
      if (existing.signature !== signature) {
        throw new Error(`Idempotency key ${idempotencyKey} was reused with different parameters.`)
      }
      return existing.receipt
    }

    const receipt: OperationReceipt = {
      accepted: true,
      operation_id: `${operationName}_${this.desiredRevision}`,
      backend: this.backend,
      desired_revision: this.desiredRevision,
      dry_run: false,
      safe_to_retry: true,
    }

    this.idempotentOperations.set(idempotencyKey, { signature, receipt })
    return receipt
  }

  private commitOperation(
    operationName: string,
    idempotencyKey: string,
    payload: Record<string, unknown>,
    apply: () => void,
    dryRun: boolean,
  ) {
    const signature = JSON.stringify({ operationName, payload })
    const existing = this.idempotentOperations.get(idempotencyKey)
    if (existing) {
      if (existing.signature !== signature) {
        throw new Error(`Idempotency key ${idempotencyKey} was reused with different parameters.`)
      }
      return existing.receipt
    }

    if (!dryRun) {
      apply()
    }

    this.desiredRevision += 1
    const receipt: OperationReceipt = {
      accepted: true,
      operation_id: `${operationName}_${this.desiredRevision}`,
      backend: this.backend,
      desired_revision: this.desiredRevision,
      dry_run: dryRun,
      safe_to_retry: true,
    }

    this.idempotentOperations.set(idempotencyKey, { signature, receipt })
    return receipt
  }

  private getDesiredFrame(universe: number) {
    this.assertUniverseAllowed(universe)
    const frame = this.desiredUniverses.get(universe)
    if (!frame) throw new Error(`Desired universe ${universe} not initialized.`)
    return frame
  }

  private getObservedFrame(universe: number) {
    this.assertUniverseAllowed(universe)
    const frame = this.observedUniverses.get(universe)
    if (!frame) throw new Error(`Observed universe ${universe} not initialized.`)
    return frame
  }

  private assertUniverseAllowed(universe: number) {
    if (!this.config.allowedUniverses.includes(universe)) {
      throw new Error(`Universe ${universe} is not allowed.`)
    }
  }

  private clampFrame(frame: Uint8Array) {
    const next = createUniverseFrame()
    const length = Math.min(frame.length, next.length)
    for (let index = 0; index < length; index += 1) {
      next[index] = Math.max(0, Math.min(255, frame[index] ?? 0))
    }
    return next
  }
}

export const mcpText = (text: string, isError = false) => ({
  content: [{ type: 'text' as const, text }],
  ...(isError ? { isError: true } : {}),
})
