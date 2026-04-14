import type { CodeDiff } from '@/types/project'

export interface DiffLine {
  type: 'added' | 'removed' | 'context'
  text: string
}

export const buildCodeDiff = (before: string, after: string, summary: string): CodeDiff => ({
  before,
  after,
  summary,
})

export const diffLines = (before: string, after: string): DiffLine[] => {
  const beforeLines = before.split('\n')
  const afterLines = after.split('\n')
  const maxLength = Math.max(beforeLines.length, afterLines.length)
  const lines: DiffLine[] = []

  for (let index = 0; index < maxLength; index += 1) {
    const beforeLine = beforeLines[index]
    const afterLine = afterLines[index]

    if (beforeLine === afterLine) {
      if (beforeLine !== undefined) {
        lines.push({ type: 'context', text: beforeLine })
      }
      continue
    }

    if (beforeLine !== undefined) {
      lines.push({ type: 'removed', text: beforeLine })
    }

    if (afterLine !== undefined) {
      lines.push({ type: 'added', text: afterLine })
    }
  }

  return lines
}
