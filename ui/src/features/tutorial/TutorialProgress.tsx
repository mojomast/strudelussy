/**
 * // What changed:
 * // - Added the tutorial progress map modal with exact chapter state handling
 * // - Implemented locked, in-progress, and completed chapter cards per spec
 */

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { chapters, type ChapterId, type LessonId } from './tutorialData'

interface TutorialProgressProps {
  open: boolean
  completedLessons: Set<LessonId>
  isChapterUnlocked: (chapterId: ChapterId) => boolean
  openTutorial: (lessonId?: LessonId) => void
  resetTutorial: () => void
  onClose: () => void
}

const TutorialProgress = ({ open, completedLessons, isChapterUnlocked, openTutorial, resetTutorial, onClose }: TutorialProgressProps) => {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose() }}>
      <DialogContent className="max-w-5xl border-[var(--ussy-divider)] bg-[var(--ussy-surface)] text-[var(--ussy-text)]">
        <DialogHeader>
          <DialogTitle>📚 Your Learning Progress</DialogTitle>
          <DialogDescription className="text-[var(--ussy-text-muted)]">
            Pick up where you left off or continue into the next unlocked chapter.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-[var(--ussy-divider)] bg-transparent text-[var(--ussy-text)] hover:bg-[var(--ussy-surface-3)]"
            onClick={() => {
              resetTutorial()
              onClose()
            }}
          >
            Reset Tutorial
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {chapters.map((chapter) => {
            const completed = chapter.lessons.filter((lesson) => completedLessons.has(lesson.id)).length
            const total = chapter.lessons.length
            const unlocked = isChapterUnlocked(chapter.id)
            const done = completed === total
            const inProgress = completed > 0 && !done
            const firstIncompleteLessonId = chapter.lessons.find((lesson) => !completedLessons.has(lesson.id))?.id ?? chapter.lessons[0].id
            const progress = total > 0 ? (completed / total) * 100 : 0
            const statusEmoji = done ? '✅' : unlocked ? '🔓' : '🔒'

            return (
              <div
                key={chapter.id}
                className={`rounded-2xl border border-[var(--ussy-divider)] bg-[var(--ussy-surface-2)] p-4 text-left ${!unlocked ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ussy-text)]">
                  <span>{statusEmoji}</span>
                  <span>{chapter.emoji}</span>
                  <span>Ch {chapter.id}</span>
                </div>
                <h3 className="mt-2 text-base font-semibold text-[var(--ussy-text)]">{chapter.title}</h3>
                <p className="mt-1 text-sm text-[var(--ussy-text-muted)]">
                  {unlocked ? `${completed}/${total}` : `0/${total} locked`}
                </p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--ussy-surface-3)]">
                  <div className="h-full bg-[var(--ussy-accent)] transition-all duration-300" style={{ width: `${done ? 100 : progress}%` }} />
                </div>
                <div className="mt-3 space-y-1">
                  {chapter.lessons.map((lesson) => (
                    <div
                      key={lesson.id}
                      className={`rounded-md border border-[var(--ussy-divider)] px-2 py-1 text-xs text-[var(--ussy-text-muted)] ${completedLessons.has(lesson.id) ? 'lesson-complete' : ''}`}
                    >
                      {lesson.id} · {lesson.title}
                    </div>
                  ))}
                </div>
                {unlocked ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-4 border-[var(--ussy-divider)] bg-transparent text-[var(--ussy-text)] hover:bg-[var(--ussy-surface-3)]"
                    onClick={() => {
                      openTutorial(firstIncompleteLessonId)
                      onClose()
                    }}
                  >
                    {inProgress ? 'Continue →' : 'Resume →'}
                  </Button>
                ) : null}
              </div>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default TutorialProgress
