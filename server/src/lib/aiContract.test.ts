import { describe, expect, it } from 'vitest'
import {
  extractFirstJsonObject,
  parseChatJsonResponse,
  sanitizeStrudelCode,
  validateGeneratedCode,
} from './aiContract'

describe('extractFirstJsonObject', () => {
  it('finds the first balanced object even with surrounding prose', () => {
    const input = 'hello {"message":"ok","code":"setcps(0.5)","diff_summary":"x","has_code_change":true} trailing'
    expect(extractFirstJsonObject(input)).toBe('{"message":"ok","code":"setcps(0.5)","diff_summary":"x","has_code_change":true}')
  })
})

describe('parseChatJsonResponse', () => {
  it('rejects malformed json content', () => {
    const result = parseChatJsonResponse('{"message":', 'setcps(0.5)')
    expect(result.has_code_change).toBe(false)
    expect(result.message).toMatch(/malformed json/i)
  })

  it('rejects schema mismatches', () => {
    const result = parseChatJsonResponse('{"message":"ok","has_code_change":false}', 'setcps(0.5)')
    expect(result.has_code_change).toBe(false)
    expect(result.message).toMatch(/required schema/i)
  })

  it('maps unsupported percussion and invalid bank voices safely', () => {
    const result = parseChatJsonResponse(
      JSON.stringify({
        message: 'Updated drums.',
        code: 'setcps(0.5)\n$: s("cowbell(3,8)").bank("RolandTR808")',
        diff_summary: 'Adjusted drums',
        has_code_change: true,
      }),
      'setcps(0.5)\n$: s("bd(3,8)").bank("RolandTR808")',
    )

    expect(result.has_code_change).toBe(true)
    expect(result.code).toContain('hh(3,8)')
    expect(result.code).toContain('.bank("RolandTR808")')
    expect(result.message).toMatch(/mapped unsupported percussion/i)
  })

  it('rejects unsupported methods instead of passing them through', () => {
    const result = parseChatJsonResponse(
      JSON.stringify({
        message: 'Added movement.',
        code: 'setcps(0.5)\n$: s("bd sd").trancegate(8)',
        diff_summary: 'Added movement',
        has_code_change: true,
      }),
      'setcps(0.5)\n$: s("bd sd")',
    )

    expect(result.has_code_change).toBe(false)
    expect(result.message).toMatch(/unsupported strudel methods/i)
  })

  it('rejects unchanged code when has_code_change is true', () => {
    const currentCode = 'setcps(0.5)\n$: s("bd sd")'
    const result = parseChatJsonResponse(
      JSON.stringify({
        message: 'No changes needed.',
        code: currentCode,
        diff_summary: 'Kept same',
        has_code_change: true,
      }),
      currentCode,
    )

    expect(result.has_code_change).toBe(false)
    expect(result.code).toBe('')
  })
})

describe('sanitizeStrudelCode', () => {
  it('blocks one-argument sometimesBy usage', () => {
    const sanitized = sanitizeStrudelCode('setcps(0.5)\n$: s("bd sd").sometimesBy(0.3)')
    expect(sanitized.blockingIssue).toMatch(/sometimesBy/i)
  })
})

describe('validateGeneratedCode', () => {
  it('extracts code from accidental json envelopes', () => {
    const result = validateGeneratedCode('{"code":"setcps(0.5)\\n$: s(\\"bd sd\\")"}')
    expect('code' in result && result.code.includes('setcps')).toBe(true)
  })

  it('rejects unchanged generated patterns during fix flows', () => {
    const currentPattern = 'setcps(0.5)\n$: s("bd sd")'
    const result = validateGeneratedCode(currentPattern, currentPattern)
    expect('error' in result && /same pattern unchanged/i.test(result.error)).toBe(true)
  })
})
