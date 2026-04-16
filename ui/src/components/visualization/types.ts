export type VisualizationMode = 'hal' | 'dmx'

export interface DmxVisualizationUniverse {
  universe: number
  revision: number
  channels: number[]
  source: 'desired' | 'observed'
}

export interface DmxVisualizationScene {
  id: string
  label: string
  target_group_id: string
}

export interface DmxVisualizationFixture {
  id: string
  label: string
  personality: Record<string, number>
  channels?: number[]
  group_ids: string[]
}

export interface DmxVisualizationGroup {
  id: string
  label: string
  fixture_ids: string[]
}

export interface DmxVisualizationPatch {
  universe: number
  fixtures: DmxVisualizationFixture[]
  groups: DmxVisualizationGroup[]
}

export interface DmxVisualizationConnection {
  connected: boolean
  backend: 'simulator' | 'ola' | 'sacn' | 'artnet'
  armed: boolean
  patch_path: string
}

export interface DmxVisualizationData {
  connection: DmxVisualizationConnection
  backend: 'simulator' | 'ola' | 'sacn' | 'artnet'
  armed: boolean
  patch: DmxVisualizationPatch
  scenes: DmxVisualizationScene[]
  universe: DmxVisualizationUniverse
}
