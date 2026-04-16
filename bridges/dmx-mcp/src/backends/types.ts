export type BackendName = 'simulator' | 'ola' | 'sacn' | 'artnet'

export interface DmxBackend {
  readonly name: BackendName
  initialize(): Promise<void>
  shutdown(): Promise<void>
  writeUniverse(universe: number, frame: Uint8Array): Promise<void>
  readObservedUniverse?(universe: number): Promise<Uint8Array | null>
}
