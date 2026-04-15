/**
 * // What changed:
 * // - Added the tutorial state hook with navigation, validation, progress, and persistence
 * // - Implemented debounced localStorage writes and resilient reads
 * // - Added inactivity-driven hint reveal behavior and chapter unlock logic
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  UNLOCK_THRESHOLD,
  allLessons,
  chapters,
  getChapterByLessonId,
  getLessonById,
  hasLessonId,
  type Chapter,
  type ChapterId,
  type Lesson,
  type LessonId,
  type ValidationResult,
} from './tutorialData'

interface TutorialState {
  isOpen: boolean
  activeTab: 'chat' | 'learn'
  activeChapterId: ChapterId
  activeLessonId: LessonId
  completedLessons: Set<LessonId>
  showProgressMap: boolean
  hintLevel: number
  lastActivity: number
}

interface PersistedState {
  activeChapterId: ChapterId
  activeLessonId: LessonId
  completedLessons: LessonId[]
  seenOverlays: LessonId[]
}

interface UseTutorialReturn {
  state: TutorialState
  currentLesson: Lesson
  currentChapter: Chapter
  chapterProgress: { completed: number; total: number }
  isChapterUnlocked: (chapterId: ChapterId) => boolean
  incompleteCount: number
  openTutorial: (lessonId?: LessonId) => void
  closeTutorial: () => void
  setActiveTab: (tab: 'chat' | 'learn') => void
  nextLesson: () => void
  prevLesson: () => void
  completeLesson: (lessonId: LessonId) => void
  getScaffold: (lessonId: LessonId) => string
  validateLesson: (lessonId: LessonId, code: string) => ValidationResult
  revealNextHint: () => void
  resetActivityTimer: () => void
  openProgressMap: () => void
  closeProgressMap: () => void
}

const STORAGE_KEY = 'strudelussy:tutorialProgress'
const DEFAULT_LESSON_ID: LessonId = '1.1'

const readPersistedState = (): PersistedState | null => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as PersistedState | null
    if (!saved || typeof saved !== 'object') {
      return null
    }
    if (!hasLessonId(saved.activeLessonId)) {
      return null
    }
    const activeChapterId = getChapterByLessonId(saved.activeLessonId).id
    return {
      activeChapterId,
      activeLessonId: saved.activeLessonId,
      completedLessons: Array.isArray(saved.completedLessons)
        ? saved.completedLessons.filter(hasLessonId)
        : [],
      seenOverlays: Array.isArray(saved.seenOverlays)
        ? saved.seenOverlays.filter(hasLessonId)
        : [],
    }
  } catch {
    return null
  }
}

export const useTutorial = (): UseTutorialReturn => {
  const persistedRef = useRef<PersistedState | null>(readPersistedState())
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  const [state, setState] = useState<TutorialState>(() => ({
    isOpen: false,
    activeTab: 'chat',
    activeChapterId: persistedRef.current?.activeChapterId ?? 1,
    activeLessonId: persistedRef.current?.activeLessonId ?? DEFAULT_LESSON_ID,
    completedLessons: new Set<LessonId>(persistedRef.current?.completedLessons ?? []),
    showProgressMap: false,
    hintLevel: 0,
    lastActivity: Date.now(),
  }))

  const currentLesson = useMemo(() => getLessonById(state.activeLessonId), [state.activeLessonId])
  const currentChapter = useMemo(() => getChapterByLessonId(state.activeLessonId), [state.activeLessonId])

  const chapterProgress = useMemo(() => {
    const completed = currentChapter.lessons.filter((entry) => state.completedLessons.has(entry.id)).length
    return { completed, total: currentChapter.lessons.length }
  }, [currentChapter, state.completedLessons])

  const isChapterUnlocked = useCallback((chapterId: ChapterId) => {
    if (chapterId <= 1) return true
    const previousChapter = chapters.find((entry) => entry.id === chapterId - 1)
    if (!previousChapter) return false
    const completed = previousChapter.lessons.filter((entry) => state.completedLessons.has(entry.id)).length
    return completed / previousChapter.lessons.length >= UNLOCK_THRESHOLD
  }, [state.completedLessons])

  const incompleteCount = useMemo(() => (
    allLessons.filter((entry) => !state.completedLessons.has(entry.id)).length
  ), [state.completedLessons])

  const persist = useCallback((nextState: PersistedState) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState))
      } catch {
        // Storage can fail in private browsing or restricted contexts.
      }
    }, 500)
  }, [])

  useEffect(() => {
    persist({
      activeChapterId: state.activeChapterId,
      activeLessonId: state.activeLessonId,
      completedLessons: Array.from(state.completedLessons),
      seenOverlays: persistedRef.current?.seenOverlays ?? [],
    })
  }, [persist, state.activeChapterId, state.activeLessonId, state.completedLessons])

  useEffect(() => () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
  }, [])

  const setActiveTab = useCallback((tab: 'chat' | 'learn') => {
    setState((current) => ({ ...current, activeTab: tab, isOpen: tab === 'learn' ? true : current.isOpen }))
  }, [])

  const openTutorial = useCallback((lessonId?: LessonId) => {
    setState((current) => {
      const nextLessonId = lessonId && hasLessonId(lessonId) ? lessonId : current.activeLessonId
      const chapter = getChapterByLessonId(nextLessonId)
      return {
        ...current,
        isOpen: true,
        activeTab: 'learn',
        activeLessonId: nextLessonId,
        activeChapterId: chapter.id,
        hintLevel: 0,
      }
    })
  }, [])

  const closeTutorial = useCallback(() => {
    setState((current) => ({ ...current, isOpen: false, activeTab: 'chat', showProgressMap: false }))
  }, [])

  const navigateToLesson = useCallback((index: number) => {
    const boundedIndex = Math.max(0, Math.min(index, allLessons.length - 1))
    const nextLesson = allLessons[boundedIndex]
    const nextChapter = getChapterByLessonId(nextLesson.id)
    setState((current) => ({
      ...current,
      activeLessonId: nextLesson.id,
      activeChapterId: nextChapter.id,
      hintLevel: 0,
      lastActivity: Date.now(),
    }))
  }, [])

  const nextLesson = useCallback(() => {
    const currentIndex = allLessons.findIndex((entry) => entry.id === state.activeLessonId)
    navigateToLesson(currentIndex + 1)
  }, [navigateToLesson, state.activeLessonId])

  const prevLesson = useCallback(() => {
    const currentIndex = allLessons.findIndex((entry) => entry.id === state.activeLessonId)
    navigateToLesson(currentIndex - 1)
  }, [navigateToLesson, state.activeLessonId])

  const completeLesson = useCallback((lessonId: LessonId) => {
    setState((current) => {
      const completedLessons = new Set(current.completedLessons)
      completedLessons.add(lessonId)
      return { ...current, completedLessons }
    })
  }, [])

  const getScaffold = useCallback((lessonId: LessonId) => getLessonById(lessonId).scaffold, [])

  const validateLesson = useCallback((lessonId: LessonId, code: string) => {
    const targetLesson = getLessonById(lessonId)
    const result = targetLesson.validator(code)
    if (result.pass) {
      setState((current) => {
        const completedLessons = new Set(current.completedLessons)
        completedLessons.add(lessonId)
        return { ...current, completedLessons, hintLevel: 0 }
      })
    }
    return result
  }, [])

  const revealNextHint = useCallback(() => {
    setState((current) => ({
      ...current,
      hintLevel: Math.min(current.hintLevel + 1, currentLesson.hints.length),
      lastActivity: Date.now(),
    }))
  }, [currentLesson.hints.length])

  const resetActivityTimer = useCallback(() => {
    setState((current) => ({ ...current, lastActivity: Date.now() }))
  }, [])

  const openProgressMap = useCallback(() => {
    setState((current) => ({ ...current, showProgressMap: true }))
  }, [])

  const closeProgressMap = useCallback(() => {
    setState((current) => ({ ...current, showProgressMap: false }))
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      if (Date.now() - state.lastActivity > 30_000 && state.hintLevel < currentLesson.hints.length) {
        setState((current) => ({
          ...current,
          hintLevel: Math.min(current.hintLevel + 1, currentLesson.hints.length),
          lastActivity: Date.now(),
        }))
      }
    }, 5_000)
    return () => clearInterval(interval)
  }, [currentLesson, state.hintLevel, state.lastActivity])

  return {
    state,
    currentLesson,
    currentChapter,
    chapterProgress,
    isChapterUnlocked,
    incompleteCount,
    openTutorial,
    closeTutorial,
    setActiveTab,
    nextLesson,
    prevLesson,
    completeLesson,
    getScaffold,
    validateLesson,
    revealNextHint,
    resetActivityTimer,
    openProgressMap,
    closeProgressMap,
  }
}
