/**
 * // What changed:
 * // - Added the tutorial state hook with spec-aligned navigation, unlocks, persistence, and hints
 * // - Enforced sequential chapter unlocking and chapter-safe lesson navigation
 * // - Implemented resilient localStorage persistence with exact timer behavior
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
  resetTutorial: () => void
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

    return {
      activeChapterId: typeof saved.activeChapterId === 'number' ? saved.activeChapterId : 1,
      activeLessonId: saved.activeLessonId,
      completedLessons: Array.isArray(saved.completedLessons) ? saved.completedLessons.filter(hasLessonId) : [],
      seenOverlays: Array.isArray(saved.seenOverlays) ? saved.seenOverlays.filter(hasLessonId) : [],
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

  const isChapterUnlocked = useCallback((chapterId: ChapterId) => {
    if (chapterId === 1) {
      return true
    }

    const previousChapter = chapters.find((chapter) => chapter.id === chapterId - 1)
    if (!previousChapter) {
      return false
    }

    const completed = previousChapter.lessons.filter((lesson) => state.completedLessons.has(lesson.id)).length
    return completed / previousChapter.lessons.length >= UNLOCK_THRESHOLD
  }, [state.completedLessons])

  const currentChapterLessons = useMemo(() => currentChapter.lessons, [currentChapter])
  const currentLessonIndex = useMemo(() => currentChapterLessons.findIndex((lesson) => lesson.id === state.activeLessonId), [currentChapterLessons, state.activeLessonId])

  const chapterProgress = useMemo(() => {
    const completed = currentChapter.lessons.filter((lesson) => state.completedLessons.has(lesson.id)).length
    return { completed, total: currentChapter.lessons.length }
  }, [currentChapter, state.completedLessons])

  const incompleteCount = useMemo(() => allLessons.filter((lesson) => !state.completedLessons.has(lesson.id)).length, [state.completedLessons])

  const persist = useCallback((nextState: PersistedState) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState))
      } catch {
        // Keep tutorial state in memory if storage is unavailable.
      }
    }, 500)
  }, [])

  useEffect(() => {
    let seenOverlays = persistedRef.current?.seenOverlays ?? []
    try {
      const latest = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as PersistedState | null
      if (latest && Array.isArray(latest.seenOverlays)) {
        seenOverlays = latest.seenOverlays.filter(hasLessonId)
      }
    } catch {
      // Keep the last known overlay state if storage read fails.
    }

    persist({
      activeChapterId: state.activeChapterId,
      activeLessonId: state.activeLessonId,
      completedLessons: Array.from(state.completedLessons),
      seenOverlays,
    })
  }, [persist, state.activeChapterId, state.activeLessonId, state.completedLessons])

  useEffect(() => () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
  }, [])

  const setActiveTab = useCallback((tab: 'chat' | 'learn') => {
    setState((current) => ({
      ...current,
      activeTab: tab,
      isOpen: tab === 'learn' ? true : current.isOpen,
    }))
  }, [])

  const openTutorial = useCallback((lessonId?: LessonId) => {
    setState((current) => {
      const requestedLessonId = lessonId && hasLessonId(lessonId) ? lessonId : current.activeLessonId
      const requestedChapter = getChapterByLessonId(requestedLessonId)

      if (!isChapterUnlocked(requestedChapter.id)) {
        return {
          ...current,
          isOpen: true,
          activeTab: 'learn',
        }
      }

      return {
        ...current,
        isOpen: true,
        activeTab: 'learn',
        activeChapterId: requestedChapter.id,
        activeLessonId: requestedLessonId,
        hintLevel: 0,
      }
    })
  }, [isChapterUnlocked])

  const closeTutorial = useCallback(() => {
    setState((current) => ({ ...current, isOpen: false, activeTab: 'chat', showProgressMap: false }))
  }, [])

  const nextLesson = useCallback(() => {
    if (currentLessonIndex >= currentChapterLessons.length - 1) {
      const nextChapter = chapters.find((chapter) => chapter.id === currentChapter.id + 1)
      if (!nextChapter || !isChapterUnlocked(nextChapter.id)) {
        return
      }

      setState((current) => ({
        ...current,
        activeChapterId: nextChapter.id,
        activeLessonId: nextChapter.lessons[0].id,
        hintLevel: 0,
      }))
      return
    }

    const next = currentChapterLessons[currentLessonIndex + 1]
    setState((current) => ({
      ...current,
      activeLessonId: next.id,
      activeChapterId: currentChapter.id,
      hintLevel: 0,
    }))
  }, [currentChapter.id, currentChapterLessons, currentLessonIndex, isChapterUnlocked])

  const prevLesson = useCallback(() => {
    if (currentLessonIndex <= 0) {
      const previousChapter = chapters.find((chapter) => chapter.id === currentChapter.id - 1)
      if (!previousChapter || !isChapterUnlocked(previousChapter.id)) {
        return
      }

      const previousLesson = previousChapter.lessons[previousChapter.lessons.length - 1]
      setState((current) => ({
        ...current,
        activeChapterId: previousChapter.id,
        activeLessonId: previousLesson.id,
        hintLevel: 0,
      }))
      return
    }

    const previous = currentChapterLessons[currentLessonIndex - 1]
    setState((current) => ({
      ...current,
      activeLessonId: previous.id,
      activeChapterId: currentChapter.id,
      hintLevel: 0,
    }))
  }, [currentChapter.id, currentChapterLessons, currentLessonIndex, isChapterUnlocked])

  const completeLesson = useCallback((lessonId: LessonId) => {
    setState((current) => {
      const completedLessons = new Set(current.completedLessons)
      completedLessons.add(lessonId)
      return { ...current, completedLessons }
    })
  }, [])

  const getScaffold = useCallback((lessonId: LessonId) => getLessonById(lessonId).scaffold, [])

  const validateLesson = useCallback((lessonId: LessonId, code: string) => {
    const result = getLessonById(lessonId).validator(code)
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

  const resetTutorial = useCallback(() => {
    try {
      localStorage.removeItem('strudelussy:seenOverlays')
      localStorage.removeItem('strudelussy:overlaysDisabled')
      localStorage.removeItem('strudelussy:overlayDismissCount')
    } catch {
      // Ignore storage failures and still reset in-memory tutorial state.
    }

    persistedRef.current = {
      activeChapterId: 1,
      activeLessonId: DEFAULT_LESSON_ID,
      completedLessons: [],
      seenOverlays: [],
    }

    setState({
      isOpen: true,
      activeTab: 'learn',
      activeChapterId: 1,
      activeLessonId: DEFAULT_LESSON_ID,
      completedLessons: new Set<LessonId>(),
      showProgressMap: false,
      hintLevel: 0,
      lastActivity: Date.now(),
    })
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      if (Date.now() - state.lastActivity > 30_000 && state.hintLevel < currentLesson.hints.length) {
        revealNextHint()
      }
    }, 5_000)

    return () => clearInterval(interval)
  }, [currentLesson, revealNextHint, state.hintLevel, state.lastActivity])

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
    resetTutorial,
    openProgressMap,
    closeProgressMap,
  }
}
