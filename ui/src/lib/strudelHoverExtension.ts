import { hoverTooltip } from '@codemirror/view'
import { FUNCTION_LESSON_MAP, LESSON_TITLE_MAP } from '@/lib/functionLessonMap'
import { STRUDEL_COMPLETIONS } from './strudel-completions'

const completionMap = new Map(STRUDEL_COMPLETIONS.map((completion) => [completion.label, completion]))

export const strudelHoverExtension = hoverTooltip((view, pos) => {
  const word = view.state.wordAt(pos)
  if (!word) {
    return null
  }

  const label = view.state.sliceDoc(word.from, word.to)
  const completion = completionMap.get(label)
  if (!completion) {
    return null
  }

  return {
    pos: word.from,
    end: word.to,
    above: true,
    create() {
      const dom = document.createElement('div')
      dom.className = 'strudel-hover-tooltip'

      const sig = document.createElement('div')
      sig.className = 'strudel-hover-sig'
      sig.textContent = `${completion.label}${completion.detail ?? ''}`
      dom.append(sig)

      if (typeof completion.info === 'string' && completion.info) {
        const desc = document.createElement('div')
        desc.className = 'strudel-hover-desc'
        desc.textContent = completion.info
        dom.append(desc)
      }

      const lessonId = FUNCTION_LESSON_MAP[`${label}(`] ?? FUNCTION_LESSON_MAP[label]
      if (lessonId) {
        const ref = document.createElement('div')
        ref.className = 'strudel-hover-lesson-ref'
        ref.textContent = `📖 Covered in: ${LESSON_TITLE_MAP[lessonId] ?? `Lesson ${lessonId}`}`
        dom.append(ref)
      }

      return { dom }
    },
  }
})
