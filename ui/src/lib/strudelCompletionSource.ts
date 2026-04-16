import { type Completion, type CompletionContext, type CompletionResult, type CompletionSource } from '@codemirror/autocomplete'
import { STRUDEL_COMPLETIONS } from './strudel-completions'
import { buildLiveCompletionSource } from './strudelLiveCompletionSource'

const TYPE_BADGE_CLASSNAME: Record<string, string> = {
  function: 'strudel-autocomplete-badge strudel-autocomplete-badge-function',
  method: 'strudel-autocomplete-badge strudel-autocomplete-badge-method',
  keyword: 'strudel-autocomplete-badge strudel-autocomplete-badge-keyword',
}

const renderCompletionLabel = (completion: Completion) => {
  const wrapper = document.createElement('div')
  wrapper.className = 'strudel-autocomplete-item'

  const header = document.createElement('div')
  header.className = 'strudel-autocomplete-item-header'

  const badge = document.createElement('span')
  badge.className = TYPE_BADGE_CLASSNAME[completion.type ?? 'keyword'] ?? TYPE_BADGE_CLASSNAME.keyword
  badge.textContent = completion.type ?? 'keyword'

  const label = document.createElement('span')
  label.className = 'strudel-autocomplete-item-label'
  label.textContent = completion.label

  const detail = document.createElement('span')
  detail.className = 'cm-completionDetail'
  detail.textContent = completion.detail ?? ''

  header.append(badge, label, detail)
  wrapper.append(header)

  if (typeof completion.info === 'string' && completion.info) {
    const info = document.createElement('div')
    info.className = 'strudel-autocomplete-item-info'
    info.textContent = completion.info
    wrapper.append(info)
  }

  return wrapper
}

export const renderStrudelCompletion = (completion: Completion) => renderCompletionLabel(completion)

const withRenderedLabel = (completion: Completion): Completion => ({
  ...completion,
  label: completion.type === 'method' ? `.${completion.label}` : completion.label,
  apply: completion.label,
})

export const strudelCompletionSource: CompletionSource = (context: CompletionContext): CompletionResult | null => {
  const before = context.matchBefore(/[\w.]*/)
  if (!before || (before.text === '' && !context.explicit)) {
    return null
  }

  const typedText = before.text
  const isMethodLookup = typedText.startsWith('.')
  const token = isMethodLookup ? typedText.slice(1) : typedText
  const tokenLower = token.toLowerCase()

  const matchedCompletions = STRUDEL_COMPLETIONS
    .filter((completion) => {
      if (isMethodLookup && completion.type !== 'method') {
        return false
      }

      if (tokenLower === '') {
        return true
      }

      return completion.label.toLowerCase().startsWith(tokenLower)
    })
    .map(withRenderedLabel)

  return {
    from: context.pos - typedText.length,
    options: matchedCompletions,
    validFor: /^[\w.]*$/,
  }
}

export function buildMergedCompletionSource(getCode: () => string): CompletionSource {
  const liveSource = buildLiveCompletionSource(getCode)

  return async (context: CompletionContext): Promise<CompletionResult | null> => {
    const [staticResult, liveResult] = await Promise.all([
      Promise.resolve(strudelCompletionSource(context)),
      Promise.resolve(liveSource(context)),
    ])

    if (!staticResult && !liveResult) {
      return null
    }

    const options = [
      ...(liveResult?.options ?? []),
      ...(staticResult?.options ?? []),
    ]

    const seen = new Set<string>()
    const deduped = options.filter((option) => {
      if (seen.has(option.label)) {
        return false
      }

      seen.add(option.label)
      return true
    })

    return {
      from: liveResult?.from ?? staticResult?.from ?? context.pos,
      options: deduped,
      validFor: /^[\w.]*/,
    }
  }
}
