export interface DemoScene {
  id: string
  label: string
  channels: number[]
  target_group_id: string
}

export const DEMO_SCENES: DemoScene[] = [
  {
    id: 'full_white',
    label: 'Full White',
    channels: [255, 255, 255, 255, 255, 255, 255, 255],
    target_group_id: 'all_washes',
  },
  {
    id: 'pulse_blue',
    label: 'Pulse Blue',
    channels: [0, 0, 255, 180, 0, 0, 255, 180],
    target_group_id: 'all_washes',
  },
  {
    id: 'amber_wash',
    label: 'Amber Wash',
    channels: [255, 96, 0, 210, 255, 96, 0, 210],
    target_group_id: 'frontline',
  },
  {
    id: 'magenta_hit',
    label: 'Magenta Hit',
    channels: [255, 0, 200, 255, 255, 0, 200, 255],
    target_group_id: 'frontline',
  },
]

export const buildSceneFrame = (channels: number[]) => {
  const frame = new Uint8Array(512)
  for (let index = 0; index < Math.min(channels.length, frame.length); index += 1) {
    frame[index] = Math.max(0, Math.min(255, Math.round(channels[index] ?? 0)))
  }
  return frame
}
