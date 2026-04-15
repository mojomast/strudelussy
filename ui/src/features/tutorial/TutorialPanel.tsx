/**
 * // What changed:
 * // - Added the spec-aligned tutorial lesson panel UI
 * // - Implemented first-use inject confirm, progressive hints, validation feedback, and chapter-local steps
 */

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import TutorialProgress from './TutorialProgress'
import type { Chapter, ChapterId, Lesson, LessonId, ValidationResult } from './tutorialData'

interface TutorialPanelProps {
  onInjectCode: (code: string) => void
  getEditorCode: () => string
  state: {
    activeLessonId: LessonId
    completedLessons: Set<LessonId>
    showProgressMap: boolean
    hintLevel: number
  }
  currentLesson: Lesson
  currentChapter: Chapter
  chapterProgress: { completed: number; total: number }
  isChapterUnlocked: (chapterId: ChapterId) => boolean
  incompleteCount: number
  nextLesson: () => void
  prevLesson: () => void
  completeLesson: (lessonId: LessonId) => void
  validateLesson: (lessonId: LessonId, code: string) => ValidationResult
  revealNextHint: () => void
  resetActivityTimer: () => void
  resetTutorial: () => void
  openProgressMap: () => void
  closeProgressMap: () => void
  openTutorial: (lessonId?: LessonId) => void
}

type ValidationState = 'idle' | 'pass' | 'fail'

const TutorialPanel = ({
  onInjectCode,
  getEditorCode,
  state,
  currentLesson,
  currentChapter,
  chapterProgress,
  isChapterUnlocked,
  nextLesson,
  prevLesson,
  validateLesson,
  revealNextHint,
  openProgressMap,
  closeProgressMap,
  resetTutorial,
  openTutorial,
}: TutorialPanelProps) => {
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false)
  const [loadedToast, setLoadedToast] = useState(false)
  const [validationState, setValidationState] = useState<ValidationState>('idle')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [hasInjectedBefore, setHasInjectedBefore] = useState(false)
  const [shakeKey, setShakeKey] = useState(0)
  const passTimeoutRef = useRef<number | null>(null)
  const advanceTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    setShowReplaceConfirm(false)
    setLoadedToast(false)
    setValidationState('idle')
    setFeedback(null)
    setShowConfetti(false)
  }, [currentLesson.id])

  useEffect(() => {
    return () => {
      if (passTimeoutRef.current) {
        window.clearTimeout(passTimeoutRef.current)
      }
      if (advanceTimeoutRef.current) {
        window.clearTimeout(advanceTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!loadedToast) {
      return
    }
    const timeout = window.setTimeout(() => setLoadedToast(false), 1600)
    return () => window.clearTimeout(timeout)
  }, [loadedToast])

  const currentLessonIndex = currentChapter.lessons.findIndex((lesson) => lesson.id === currentLesson.id)
  const isFirstLesson = currentChapter.id === 1 && currentLessonIndex === 0
  const isLastLesson = currentLessonIndex === currentChapter.lessons.length - 1 && !isChapterUnlocked(currentChapter.id + 1)
  const progressWidth = `${(chapterProgress.completed / chapterProgress.total) * 100}%`

  const injectScaffold = () => {
    onInjectCode(currentLesson.scaffold)
    setHasInjectedBefore(true)
    setShowReplaceConfirm(false)
    setLoadedToast(true)
  }

  const handleInjectClick = () => {
    if (!hasInjectedBefore && getEditorCode().trim().length > 0) {
      setShowReplaceConfirm(true)
      return
    }
    injectScaffold()
  }

  const handleValidate = () => {
    const result = validateLesson(currentLesson.id, getEditorCode())
    if (result.pass) {
      setValidationState('pass')
      setFeedback('🎉 Nice! You nailed it.')
      setShowConfetti(true)

      if (passTimeoutRef.current) {
        window.clearTimeout(passTimeoutRef.current)
      }
      if (advanceTimeoutRef.current) {
        window.clearTimeout(advanceTimeoutRef.current)
      }

      passTimeoutRef.current = window.setTimeout(() => {
        setValidationState('idle')
      }, 600)

      advanceTimeoutRef.current = window.setTimeout(() => {
        setShowConfetti(false)
        nextLesson()
      }, 1200)
      return
    }

    setValidationState('fail')
    setFeedback(result.hint ?? 'Not quite yet. Try the next hint.')
    setShakeKey((value) => value + 1)
    revealNextHint()
    window.setTimeout(() => setValidationState('idle'), 400)
  }

  return (
    <div className="flex h-full min-h-0 flex-col text-left">
      <div className="flex items-center justify-between border-b border-[var(--ussy-divider)] px-4 py-3">
        <p className="text-sm font-semibold text-[var(--ussy-text)]">📚 Learn Strudel</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs text-[var(--ussy-text-muted)] hover:bg-[var(--ussy-surface-2)] hover:text-[var(--ussy-text)]"
          onClick={openProgressMap}
        >
          Progress Map
        </Button>
      </div>

      <div className="border-b border-[var(--ussy-divider)] px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--ussy-text-muted)]">Ch {currentChapter.id} · {currentChapter.title}</p>
          <span className="text-xs text-[var(--ussy-text-muted)]">{chapterProgress.completed}/{chapterProgress.total}</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--ussy-surface-2)]" role="progressbar" aria-valuenow={chapterProgress.completed} aria-valuemin={0} aria-valuemax={chapterProgress.total}>
          <div className="h-full bg-[var(--ussy-accent)] transition-[width] duration-[400ms] ease" style={{ width: progressWidth }} />
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-auto px-4 py-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--ussy-text)]">{currentLesson.id} — {currentLesson.title}</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--ussy-text-muted)]">{currentLesson.instructions}</p>
        </div>

        <pre className="overflow-auto rounded-xl border border-[var(--ussy-divider)] bg-[var(--ussy-surface-2)] p-3 text-sm text-[var(--ussy-text)]">{currentLesson.scaffold}</pre>

        <div className="space-y-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-[var(--ussy-divider)] bg-transparent text-[var(--ussy-text)] hover:bg-[var(--ussy-surface-2)]"
            onClick={handleInjectClick}
          >
            Load into editor ↗
          </Button>

          {showReplaceConfirm ? (
            <div className="rounded-xl border border-[var(--ussy-divider)] bg-[var(--ussy-surface-2)] p-3 text-sm text-[var(--ussy-text)]">
              <p>Replace current code?</p>
              <div className="mt-2 flex gap-2">
                <Button type="button" size="sm" className="border border-[var(--ussy-divider)] bg-[var(--ussy-accent)] text-[var(--ussy-bg)] hover:bg-[var(--ussy-accent-bright)]" onClick={injectScaffold}>Yes</Button>
                <Button type="button" size="sm" variant="outline" className="border-[var(--ussy-divider)] bg-transparent text-[var(--ussy-text)] hover:bg-[var(--ussy-surface-3)]" onClick={() => setShowReplaceConfirm(false)}>Cancel</Button>
              </div>
            </div>
          ) : null}

          {loadedToast ? (
            <p className="text-xs text-[var(--ussy-accent)]" aria-live="polite">Loaded into editor!</p>
          ) : null}
        </div>

        <div>
          <button
            type="button"
            className="text-sm text-[var(--ussy-accent)] hover:underline"
            onClick={revealNextHint}
            aria-expanded={state.hintLevel > 0}
            aria-controls="tutorial-hints"
          >
            💡 Show hint
          </button>
          {state.hintLevel > 0 ? (
            <div id="tutorial-hints" className="mt-3 rounded-xl border border-[var(--ussy-divider)] bg-[var(--ussy-surface-2)] p-3">
              <p className="text-sm font-medium text-[var(--ussy-text)]">Hints:</p>
              <ul className="mt-2 space-y-2 text-sm text-[var(--ussy-text-muted)]">
                {currentLesson.hints.slice(0, state.hintLevel).map((hint, index) => (
                  <li key={`${currentLesson.id}-${index}`}>• {hint}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

          <div key={shakeKey} className={validationState === 'fail' ? 'tutorial-shake' : ''}>
            <Button
              type="button"
              className={`relative overflow-hidden border border-[var(--ussy-divider)] ${validationState === 'pass' ? 'bg-[var(--ussy-accent)] text-[var(--ussy-bg)] hover:bg-[var(--ussy-accent-bright)]' : 'bg-[var(--ussy-surface-2)] text-[var(--ussy-text)] hover:bg-[var(--ussy-surface-3)]'}`}
              onClick={handleValidate}
              aria-label="Check my code"
            >
            {validationState === 'pass' ? '✓ Nice!' : '✓ Check my code'}
            {showConfetti ? (
              <span className="tutorial-confetti pointer-events-none absolute inset-0">
                {Array.from({ length: 8 }).map((_, index) => <span key={index} />)}
              </span>
            ) : null}
          </Button>
        </div>

        {feedback ? (
          <div className="rounded-xl border border-[var(--ussy-divider)] bg-[var(--ussy-surface-2)] p-3 text-sm text-[var(--ussy-text)]" aria-live="polite">
            <p>{feedback}</p>
            {validationState === 'pass' ? (
              <Button type="button" variant="link" className="h-auto px-0 text-[var(--ussy-accent)]" onClick={nextLesson}>Next lesson →</Button>
            ) : null}
          </div>
        ) : null}

        <div className="border-t border-[var(--ussy-divider)] pt-4">
          <div className="flex items-center justify-between">
            <Button type="button" variant="outline" size="sm" className="border-[var(--ussy-divider)] bg-transparent text-[var(--ussy-text)] hover:bg-[var(--ussy-surface-2)]" onClick={prevLesson} disabled={isFirstLesson}>
              ← Prev
            </Button>
            <Button type="button" variant="outline" size="sm" className="border-[var(--ussy-divider)] bg-transparent text-[var(--ussy-text)] hover:bg-[var(--ussy-surface-2)]" onClick={nextLesson} disabled={isLastLesson}>
              Next →
            </Button>
          </div>

          <div className="mt-4 flex items-center gap-2">
            {currentChapter.lessons.map((lesson, index) => {
              const isCurrent = lesson.id === currentLesson.id
              const isComplete = state.completedLessons.has(lesson.id)
              return (
                <button
                  key={lesson.id}
                  type="button"
                  onClick={() => openTutorial(lesson.id)}
                  className={`h-2.5 w-2.5 rounded-full ${isComplete || isCurrent ? 'bg-[var(--ussy-accent)]' : 'bg-[var(--ussy-surface-3)]'} ${isCurrent ? 'ring-2 ring-[var(--ussy-text)] ring-offset-2 ring-offset-[var(--ussy-surface)]' : ''}`}
                  aria-label={`Lesson ${index + 1} of ${currentChapter.lessons.length}`}
                />
              )
            })}
          </div>
        </div>
      </div>

      <TutorialProgress
        open={state.showProgressMap}
        completedLessons={state.completedLessons}
        isChapterUnlocked={isChapterUnlocked}
        openTutorial={openTutorial}
        resetTutorial={resetTutorial}
        onClose={closeProgressMap}
      />
    </div>
  )
}

export default TutorialPanel
