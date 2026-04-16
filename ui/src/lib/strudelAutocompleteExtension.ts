import { acceptCompletion, autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap, completionStatus } from '@codemirror/autocomplete'
import type { KeyBinding } from '@codemirror/view'
import { keymap } from '@codemirror/view'
import { indentWithTab } from '@codemirror/commands'
import { renderStrudelCompletion, strudelCompletionSource } from './strudelCompletionSource'

const tabCompletionKeymap: KeyBinding = {
  key: 'Tab',
  run: (view) => {
    if (completionStatus(view.state) === 'active') {
      return acceptCompletion(view)
    }

    return indentWithTab.run?.(view) ?? false
  },
}

export const strudelAutocompleteExtension = [
  closeBrackets(),
  autocompletion({
    override: [strudelCompletionSource],
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
]
