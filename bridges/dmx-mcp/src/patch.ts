import { readFileSync } from 'node:fs'

export interface DmxFixture {
  id: string
  label: string
  channels: number[]
  group_ids: string[]
}

export interface DmxGroup {
  id: string
  label: string
  fixture_ids: string[]
}

export interface DmxPatch {
  universe: number
  fixtures: DmxFixture[]
  groups: DmxGroup[]
}

export const DEFAULT_PATCH: DmxPatch = {
  universe: 1,
  fixtures: [
    {
      id: 'wash_left',
      label: 'Wash Left',
      channels: [1, 2, 3, 4],
      group_ids: ['all_washes', 'frontline'],
    },
    {
      id: 'wash_right',
      label: 'Wash Right',
      channels: [5, 6, 7, 8],
      group_ids: ['all_washes', 'frontline'],
    },
  ],
  groups: [
    {
      id: 'all_washes',
      label: 'All Washes',
      fixture_ids: ['wash_left', 'wash_right'],
    },
    {
      id: 'frontline',
      label: 'Frontline',
      fixture_ids: ['wash_left', 'wash_right'],
    },
  ],
}

export const loadPatchFromFile = (filePath: string): DmxPatch => {
  const raw = readFileSync(filePath, 'utf8')
  const parsed = JSON.parse(raw) as DmxPatch
  return parsed
}
