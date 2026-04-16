/**
 * // What changed:
 * // - Added barrel exports for the tutorial feature surface
 */

export { default as TutorialPanel } from './TutorialPanel'
export { default as TutorialOverlay } from './TutorialOverlay'
export { default as TutorialProgress } from './TutorialProgress'
export { useTutorial } from './useTutorial'
export { FUNCTION_LESSON_MAP } from '@/lib/functionLessonMap'
export { chapters } from './tutorialData'
export type { Lesson, Chapter, LessonId, ChapterId, ValidationResult } from './tutorialData'
