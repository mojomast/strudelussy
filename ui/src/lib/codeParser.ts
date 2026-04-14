import type { ExtractedParam, SectionMarker } from '@/types/project'

const sectionPattern = /^\s*\/\/\s*\[([^\]]+)\]/
const scalePattern = /\.scale\((['"`])([^'"`]+)\1\)/g
const cpsPattern = /setcps\((\d*\.?\d+)\)/g
const paramPatterns = [
  { label: 'Gain', kind: 'gain' as const, regex: /\.gain\((\d*\.?\d+)\)/g, min: 0, max: 1.5 },
  { label: 'Speed', kind: 'speed' as const, regex: /\.speed\((\d*\.?\d+)\)/g, min: 0.25, max: 4 },
  { label: 'Room', kind: 'room' as const, regex: /\.room\((\d*\.?\d+)\)/g, min: 0, max: 1 },
  { label: 'CPS', kind: 'cps' as const, regex: /setcps\((\d*\.?\d+)\)/g, min: 0.1, max: 2 },
]

const formatParamValue = (value: number) => {
  const fixed = value.toFixed(3)
  return fixed.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1')
}

export const parseBpmFromCode = (code: string): number | undefined => {
  const matches = [...code.matchAll(cpsPattern)]
  const cps = matches.length > 0 ? matches[matches.length - 1][1] : undefined
  if (!cps) return undefined
  const bpm = Number.parseFloat(cps) * 240
  return Number.isFinite(bpm) ? Math.round(bpm) : undefined
}

export const parseKeyFromCode = (code: string): string | undefined => {
  const matches = [...code.matchAll(scalePattern)]
  const value = matches.length > 0 ? matches[matches.length - 1][2] : undefined
  if (!value) return undefined
  return value.replace(':', ' ')
}

export const parseSections = (code: string): SectionMarker[] => {
  return code
    .split('\n')
    .map((line, index) => {
      const match = line.match(sectionPattern)
      if (!match) return null
      return { label: match[1].trim(), line: index + 1 }
    })
    .filter((section): section is SectionMarker => section !== null)
}

export const extractParams = (code: string): ExtractedParam[] => {
  const params: ExtractedParam[] = []

  for (const { label, kind, regex, min, max } of paramPatterns) {
    const matches = [...code.matchAll(regex)]
    matches.forEach((match, index) => {
      const value = Number.parseFloat(match[1])
      if (!Number.isFinite(value)) return
      const matchIndex = match.index ?? 0
      const valueIndex = match[0].indexOf(match[1])
      params.push({
        id: `${label.toLowerCase()}-${index}-${matchIndex}`,
        label,
        kind,
        value,
        min,
        max,
        expression: match[0],
        valueStart: matchIndex + valueIndex,
        valueEnd: matchIndex + valueIndex + match[1].length,
      })
    })
  }

  return params
}

export const upsertSetcpsFromBpm = (code: string, bpm: number): string => {
  const cps = Math.max(0.1, Math.round((bpm / 240) * 1000) / 1000)
  const replacement = `setcps(${cps})`
  if (cpsPattern.test(code)) {
    cpsPattern.lastIndex = 0
    return code.replace(cpsPattern, replacement)
  }

  return `${replacement}\n\n${code.trimStart()}`
}

export const updateDetectedParamInCode = (code: string, param: ExtractedParam, nextValue: number): string => {
  const boundedValue = Math.min(param.max, Math.max(param.min, nextValue))
  const formattedValue = formatParamValue(boundedValue)
  return `${code.slice(0, param.valueStart)}${formattedValue}${code.slice(param.valueEnd)}`
}
