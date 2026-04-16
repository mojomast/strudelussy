import { describe, expect, it } from 'vitest'
import { countSections, parseBpmFromCode, upsertSetcpm } from './transport-tools'

describe('transport MCP helpers', () => {
  it('set_bpm prepends setcpm correctly', () => {
    expect(upsertSetcpm('$: s("bd sd")', 120)).toContain('setcpm(60)')
  })

  it('get_state BPM parser reads setcpm values', () => {
    expect(parseBpmFromCode('setcpm(72)\n$: s("bd sd")')).toBe(144)
  })

  it('get_state counts section markers', () => {
    const code = '// [intro]\n$: s("bd")\n\n// [drop]\n$: s("sd")'
    expect(countSections(code)).toBe(2)
  })
})
