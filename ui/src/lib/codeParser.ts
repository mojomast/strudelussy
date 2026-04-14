import type { ExtractedParam, SectionMarker } from '@/types/project'

const sectionPattern = /^\s*\/\/\s*\[([^\]]+)\]/
const scalePattern = /\.scale\((['"`])([^'"`]+)\1\)/g
const cpsPattern = /setcps\((\d*\.?\d+)\)/g
const paramPatterns = [
  { label: 'Gain', regex: /\.gain\((\d*\.?\d+)\)/g, min: 0, max: 1.5 },
  { label: 'Speed', regex: /\.speed\((\d*\.?\d+)\)/g, min: 0.25, max: 4 },
  { label: 'Room', regex: /\.room\((\d*\.?\d+)\)/g, min: 0, max: 1 },
  { label: 'CPS', regex: /setcps\((\d*\.?\d+)\)/g, min: 0.1, max: 2 },
]

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

  for (const { label, regex, min, max } of paramPatterns) {
    const matches = [...code.matchAll(regex)]
    matches.forEach((match, index) => {
      const value = Number.parseFloat(match[1])
      if (!Number.isFinite(value)) return
      params.push({
        id: `${label.toLowerCase()}-${index}-${match.index ?? 0}`,
        label,
        value,
        min,
        max,
        expression: match[0],
      })
    })
  }

  return params
}

export const upsertSetcpsFromBpm = (code: string, bpm: number): string => {
  const cps = Math.max(1, Math.round((bpm / 240) * 1000) / 1000)
  const replacement = `setcps(${cps})`
  if (cpsPattern.test(code)) {
    cpsPattern.lastIndex = 0
    return code.replace(cpsPattern, replacement)
  }

  return `${replacement}\n\n${code.trimStart()}`
}
