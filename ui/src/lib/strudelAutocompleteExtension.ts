import { acceptCompletion, autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap, completionStatus, type Completion } from '@codemirror/autocomplete'
import type { KeyBinding } from '@codemirror/view'
import { keymap } from '@codemirror/view'
import { indentWithTab } from '@codemirror/commands'
import { buildMergedCompletionSource, renderStrudelCompletion } from './strudelCompletionSource'
import { strudelHoverExtension } from './strudelHoverExtension'

interface StrudelExtensionStatusOk {
  status: 'ok'
  extensions: string[]
}

interface StrudelExtensionStatusDegraded {
  status: 'degraded'
  error: string
  fallback: true
}

declare global {
  interface Window {
    __strudelExtensions?: StrudelExtensionStatusOk | StrudelExtensionStatusDegraded
  }
}

const setStrudelExtensionStatus = (status: Window['__strudelExtensions']) => {
  if (typeof window === 'undefined') {
    return
  }

  window.__strudelExtensions = status
}

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
    const extensions = [
      closeBrackets(),
      autocompletion({
        ...autocompleteConfig,
        override: [mergedSource],
      }),
      baseKeymap,
      strudelHoverExtension,
    ]

    setStrudelExtensionStatus({
      status: 'ok',
      extensions: ['closeBrackets', 'autocompletion', 'keymap', 'strudelHoverExtension'],
    })

    return extensions
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn('[strudelAutocomplete] failed to build extension:', error)
    setStrudelExtensionStatus({
      status: 'degraded',
      error: message,
      fallback: true,
    })

    return [
      closeBrackets(),
      autocompletion(autocompleteConfig),
      baseKeymap,
    ]
  }
}
