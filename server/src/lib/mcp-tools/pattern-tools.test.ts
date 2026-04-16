import { describe, expect, it } from 'vitest'
import { sanitizePatternInput } from './shared'
import { doubleSpeedPattern, halfSpeedPattern, humanizePattern, replaceSection, reversePattern, scramblePattern } from './pattern-tools'

describe('pattern MCP helpers', () => {
  it('rejects oversized code', () => {
    const result = sanitizePatternInput('a'.repeat(8200))
    expect('error' in result && /8192/i.test(result.error)).toBe(true)
  })

  it('rejects unsupported methods via shared sanitization', () => {
    const result = sanitizePatternInput('setcps(0.5)\n$: s("bd sd").trancegate(8)')
    expect('error' in result && /unsupported strudel methods/i.test(result.error)).toBe(true)
  })

  it('mutate helpers produce expected transforms', () => {
    expect(reversePattern('bd sd')).toBe('ds db')
    expect(scramblePattern('bd sd hh')).toBe('hh sd bd')
    expect(doubleSpeedPattern('$: s("bd")')).toContain('.fast(2)')
    expect(halfSpeedPattern('$: s("bd")')).toContain('.slow(2)')
    expect(humanizePattern('$: s("bd")')).toContain('.swing(0.03)')
  })

  it('replaceSection swaps a named section block', () => {
    const source = '// [intro]\n$: s("bd")\n\n// [drop]\n$: s("sd")\n'
    const result = replaceSection(source, 'intro', '$: s("hh")')
    expect(result).toContain('// [intro]\n$: s("hh")')
    expect(result).toContain('// [drop]\n$: s("sd")')
  })
})
