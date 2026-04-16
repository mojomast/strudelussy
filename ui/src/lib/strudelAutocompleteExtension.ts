import { acceptCompletion, autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap, completionStatus, type Completion } from '@codemirror/autocomplete'
import type { KeyBinding } from '@codemirror/view'
import { keymap } from '@codemirror/view'
import { indentWithTab } from '@codemirror/commands'
import { buildMergedCompletionSource, renderStrudelCompletion } from './strudelCompletionSource'
import { strudelHoverExtension } from './strudelHoverExtension'

const tabCompletionKeymap: KeyBinding = {
  key: 'Tab',
  run: (view) => {
    if (completionStatus(view.state) === 'active') {
      return acceptCompletion(view)
    }

    return indentWithTab.run?.(view) ?? false
  },
}

export function buildStrudelAutocompleteExtension(getCode: () => string) {
  const baseKeymap = keymap.of([
    tabCompletionKeymap,
    ...closeBracketsKeymap,
    ...completionKeymap,
  ])

  const autocompleteConfig = {
    activateOnTyping: true,
    selectOnOpen: true,
    closeOnBlur: false,
    maxRenderedOptions: 12,
    tooltipClass: () => 'strudel-autocomplete-tooltip',
    addToOptions: [
      {
        render: (completion: Completion) => renderStrudelCompletion(completion),
        position: 20,
      },
    ],
  }

  try {
    const mergedSource = buildMergedCompletionSource(getCode)

    return [
      closeBrackets(),
      autocompletion({
        ...autocompleteConfig,
        override: [mergedSource],
      }),
      baseKeymap,
      strudelHoverExtension,
    ]
  } catch (error) {
    console.error('[strudelAutocomplete] failed to build extension:', error)

    return [
      closeBrackets(),
      autocompletion(autocompleteConfig),
      baseKeymap,
    ]
  }
}
