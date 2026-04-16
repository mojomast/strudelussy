import { type Completion, type CompletionContext, type CompletionResult, type CompletionSource } from '@codemirror/autocomplete'
import { parseTracks } from '@/lib/codeParser'

const VARIABLE_PATTERN = /(?:const|let|var)\s+(\w+)\s*=/g

const toLiveCompletions = (code: string): Completion[] => {
  const completions: Completion[] = []
  const seen = new Set<string>()

  for (const match of code.matchAll(VARIABLE_PATTERN)) {
    const label = match[1]
    if (!label || seen.has(label)) {
      continue
    }

    seen.add(label)
    completions.push({
      label,
      type: 'variable',
      detail: 'local variable',
      info: 'Local variable declared earlier in this Strudel file.',
    })
  }

  for (const track of parseTracks(code)) {
    if (seen.has(track.name)) {
      continue
    }

    seen.add(track.name)
    completions.push({
      label: track.name,
      type: 'variable',
      detail: 'track',
      info: 'Named track parsed from the current Strudel code.',
    })
  }

  return completions
}

export function buildLiveCompletionSource(getCode: () => string): CompletionSource {
  return (context: CompletionContext): CompletionResult | null => {
    const before = context.matchBefore(/[\w.]*/)
    if (!before || (before.text === '' && !context.explicit)) {
      return null
    }

    const typedText = before.text
    if (typedText.startsWith('.')) {
      return null
    }

    const token = typedText
    const tokenLower = token.toLowerCase()
    const matchedCompletions = toLiveCompletions(getCode()).filter((completion) => {
      if (tokenLower === '') {
        return true
      }

      return completion.label.toLowerCase().startsWith(tokenLower)
    })

    return {
      from: context.pos - token.length,
      options: matchedCompletions,
      validFor: /^[\w.]*$/,
    }
  }
}
