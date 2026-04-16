import { readFileSync } from 'node:fs'
import { z } from 'zod'

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

export const DmxFixtureSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  channels: z.array(z.number().int().min(1).max(512)).min(1),
  group_ids: z.array(z.string().min(1)),
})

export const DmxGroupSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  fixture_ids: z.array(z.string().min(1)).min(1),
})

export const DmxPatchSchema = z.object({
  universe: z.number().int().min(1),
  fixtures: z.array(DmxFixtureSchema).min(1),
  groups: z.array(DmxGroupSchema).min(1),
})

export const DEFAULT_PATCH: DmxPatch = {
  universe: 1,
  fixtures: [
    {
      id: 'wash_left',
      label: 'Wash Left',
      channels: [1, 2, 3, 4, 5],
      group_ids: ['all_washes', 'frontline'],
    },
    {
      id: 'wash_right',
      label: 'Wash Right',
      channels: [6, 7, 8, 9, 10],
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

DmxPatchSchema.parse(DEFAULT_PATCH)

export const loadPatchFromFile = (filePath: string): DmxPatch => {
  try {
    const raw = readFileSync(filePath, 'utf8')
    const parsed = JSON.parse(raw) as unknown
    return DmxPatchSchema.parse(parsed)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const details = error.errors.map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`).join('; ')
      throw new Error(`Invalid DMX patch file at ${filePath}: ${details}`)
    }

    if (error instanceof Error) {
      throw new Error(`Unable to load DMX patch file at ${filePath}: ${error.message}`)
    }

    throw new Error(`Unable to load DMX patch file at ${filePath}: unknown error`)
  }
}
