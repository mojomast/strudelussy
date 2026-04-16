import { acceptCompletion, autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap, completionStatus } from '@codemirror/autocomplete'
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
  const mergedSource = buildMergedCompletionSource(getCode)

  return [
    closeBrackets(),
    autocompletion({
      override: [mergedSource],
      activateOnTyping: true,
      selectOnOpen: true,
      closeOnBlur: false,
      maxRenderedOptions: 12,
      tooltipClass: () => 'strudel-autocomplete-tooltip',
      addToOptions: [
        {
          render: (completion) => renderStrudelCompletion(completion),
          position: 20,
        },
      ],
    }),
    keymap.of([
      tabCompletionKeymap,
      ...closeBracketsKeymap,
      ...completionKeymap,
    ]),
    strudelHoverExtension,
  ]
}
