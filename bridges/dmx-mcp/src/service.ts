import type { DmxBackend } from './backends/types'
import type { DmxMcpConfig } from './config'
import { DEFAULT_PATCH, type DmxGroup, type DmxPatch, loadPatchFromFile } from './patch'
import { DEMO_SCENES } from './scenes'
import { DmxStateStore } from './state'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export class DmxBridgeService {
  readonly state: DmxStateStore
  private patch: DmxPatch
  private backendConnected = false

  constructor(
    private readonly config: DmxMcpConfig,
    private readonly backend: DmxBackend,
  ) {
    this.state = new DmxStateStore(config, backend.name)
    this.patch = DEFAULT_PATCH
  }

  async initialize() {
    this.patch = loadPatchFromFile(this.config.patchPath)
    await this.backend.initialize()
    this.backendConnected = true
  }

  async shutdown() {
    await this.backend.shutdown()
    this.backendConnected = false
  }

  getCapabilities() {
    return this.state.getCapabilities()
  }

  getPatch() {
    return this.patch
  }

  getBackendStatus() {
    return this.state.getBackendStatus()
  }

  getConnectionStatus() {
    return {
      connected: this.backendConnected,
      backend: this.getBackendStatus().backend,
      armed: this.state.isArmed(),
      patch_path: this.config.patchPath,
    }
  }

  async getDesiredUniverse(universe: number) {
    return this.state.getDesiredUniverse(universe)
  }

  async getObservedUniverse(universe: number) {
    await this.syncObservedUniverse(universe)
    return this.state.getObservedUniverse(universe)
  }

  async getVisualizationState(universe = this.config.allowedUniverses[0] ?? 1) {
    const observed = await this.getObservedUniverse(universe)
    return {
      connection: this.getConnectionStatus(),
      backend: this.getBackendStatus().backend,
      armed: this.state.isArmed(),
      patch: this.getPatch(),
      scenes: this.listScenes(),
      universe: observed,
    }
  }

  listScenes() {
    return DEMO_SCENES.map(({ id, label, target_group_id }) => ({ id, label, target_group_id }))
  }

  listGroups() {
    return this.patch.groups
  }

  async arm(idempotencyKey: string, dryRun: boolean) {
    return this.state.arm(idempotencyKey, dryRun)
  }

  async disarm(idempotencyKey: string, dryRun: boolean) {
    return this.state.disarm(idempotencyKey, dryRun)
  }

  async blackout(idempotencyKey: string, dryRun: boolean) {
    const receipt = this.state.blackout(idempotencyKey, dryRun)
    if (!dryRun) {
      for (const universe of this.config.allowedUniverses) {
        const zeroFrame = new Uint8Array(512)
        await this.throttleWrite()
        await this.backend.writeUniverse(universe, zeroFrame)
        this.state.applyObservedWrite(universe, zeroFrame)
      }
    }
    return receipt
  }

  async applyScene(sceneId: string, idempotencyKey: string, dryRun: boolean) {
    const scene = DEMO_SCENES.find((candidate) => candidate.id === sceneId)
    if (!scene) {
      throw new Error(`Unknown scene ${sceneId}.`)
    }

    if (this.backend.name !== 'simulator' && !this.state.isArmed() && !dryRun) {
      throw new Error('Output is disarmed. Arm the bridge before writing to a live backend.')
    }

    const group = this.patch.groups.find((candidate) => candidate.id === scene.target_group_id)
    if (!group) {
      throw new Error(`Scene ${scene.id} targets unknown group ${scene.target_group_id}.`)
    }

    const frame = this.renderGroupFrame(group, scene.values)
    const universe = this.patch.universe
    const payload = { scene_id: scene.id, dry_run: dryRun, universe }

    if (dryRun) {
      return {
        accepted: true,
        operation_id: `apply_scene_${scene.id}_dry_run`,
        backend: this.backend.name,
        desired_revision: this.state.getDesiredUniverse(universe).revision,
        dry_run: true,
        safe_to_retry: true,
        scene_id: scene.id,
        scene_label: scene.label,
        target_group_id: scene.target_group_id,
      }
    }

    const revision = this.state.recordDesiredWrite(universe, frame)
    await this.throttleWrite()
    await this.backend.writeUniverse(universe, frame)
    const observed = await this.backend.readObservedUniverse?.(universe)
    this.state.applyObservedWrite(universe, observed ?? frame)
    const receipt = this.state.commitExternalOperation('apply_scene', idempotencyKey, payload)

    return {
      ...receipt,
      operation_id: `apply_scene_${scene.id}_${revision}`,
      desired_revision: revision,
      dry_run: false,
      scene_id: scene.id,
      scene_label: scene.label,
      target_group_id: scene.target_group_id,
    }
  }

  async setGroupState(
    groupId: string,
    values: { intensity?: number; red?: number; green?: number; blue?: number; white?: number },
    idempotencyKey: string,
    dryRun: boolean,
  ) {
    const group = this.patch.groups.find((candidate) => candidate.id === groupId)
    if (!group) {
      throw new Error(`Unknown group ${groupId}.`)
    }

    if (this.backend.name !== 'simulator' && !this.state.isArmed() && !dryRun) {
      throw new Error('Output is disarmed. Arm the bridge before writing to a live backend.')
    }

    const frame = this.renderGroupFrame(group, values)
    const universe = this.patch.universe
    const payload = { group_id: group.id, values, dry_run: dryRun, universe }

    if (dryRun) {
      return {
        accepted: true,
        operation_id: `set_group_state_${group.id}_dry_run`,
        backend: this.backend.name,
        desired_revision: this.state.getDesiredUniverse(universe).revision,
        dry_run: true,
        safe_to_retry: true,
        group_id: group.id,
        values,
      }
    }

    const revision = this.state.recordDesiredWrite(universe, frame)
    await this.throttleWrite()
    await this.backend.writeUniverse(universe, frame)
    const observed = await this.backend.readObservedUniverse?.(universe)
    this.state.applyObservedWrite(universe, observed ?? frame)
    const receipt = this.state.commitExternalOperation('set_group_state', idempotencyKey, payload)

    return {
      ...receipt,
      operation_id: `set_group_state_${group.id}_${revision}`,
      desired_revision: revision,
      dry_run: false,
      group_id: group.id,
      values,
    }
  }

  private async syncObservedUniverse(universe: number) {
    const observed = await this.backend.readObservedUniverse?.(universe)
    if (observed) {
      this.state.applyObservedWrite(universe, observed)
    }
  }

  private renderGroupFrame(
    group: DmxGroup,
    values: { intensity?: number; red?: number; green?: number; blue?: number; white?: number },
  ) {
    const frame = Uint8Array.from(this.state.getDesiredUniverse(this.patch.universe).channels)

    for (const fixtureId of group.fixture_ids) {
      const fixture = this.patch.fixtures.find((candidate) => candidate.id === fixtureId)
      if (!fixture) {
        const warning = `Group ${group.id} references unknown fixture ${fixtureId}.`
        console.warn(warning)
        if (this.config.safeMode) {
          throw new Error(warning)
        }
        continue
      }

      const [dimmerChannel, redChannel, greenChannel, blueChannel, whiteChannel] = fixture.channels
      const entries: Array<[number | undefined, number | undefined]> = [
        [dimmerChannel, values.intensity],
        [redChannel, values.red],
        [greenChannel, values.green],
        [blueChannel, values.blue],
        [whiteChannel, values.white],
      ]

      for (const [channel, value] of entries) {
        if (!channel || value === undefined) {
          continue
        }
        frame[channel - 1] = Math.max(0, Math.min(255, Math.round(value)))
      }
    }

    return frame
  }

  private async throttleWrite() {
    const minimumIntervalMs = 1000 / this.config.maxFps
    const elapsedMs = Date.now() - this.state.getLastWriteAt()
    if (elapsedMs < minimumIntervalMs) {
      await sleep(Math.ceil(minimumIntervalMs - elapsedMs))
    }
  }
}
