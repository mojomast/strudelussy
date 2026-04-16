export interface DemoScene {
  id: string
  label: string
  values: {
    intensity?: number
    red?: number
    green?: number
    blue?: number
    white?: number
  }
  target_group_id: string
}

export const DEMO_SCENES: DemoScene[] = [
  {
    id: 'full_white',
    label: 'Full White',
    values: { intensity: 200, red: 200, green: 200, blue: 200, white: 200 },
    target_group_id: 'all_washes',
  },
  {
    id: 'pulse_blue',
    label: 'Pulse Blue',
    values: { intensity: 180, red: 0, green: 0, blue: 200, white: 0 },
    target_group_id: 'all_washes',
  },
  {
    id: 'amber_wash',
    label: 'Amber Wash',
    values: { intensity: 200, red: 200, green: 96, blue: 0, white: 0 },
    target_group_id: 'frontline',
  },
  {
    id: 'magenta_hit',
    label: 'Magenta Hit',
    values: { intensity: 200, red: 200, green: 0, blue: 200, white: 0 },
    target_group_id: 'frontline',
  },
]
