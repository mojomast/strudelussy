# Tutorial Data Layer Spec

> See also: [Overview](./TUTORIAL_OVERVIEW.md) · [Curriculum](./TUTORIAL_CURRICULUM.md) · [Components](./TUTORIAL_COMPONENTS.md)

All curriculum and state logic lives in `ui/src/features/tutorial/`.

---

## TypeScript Types — `tutorialData.ts`

```typescript
export type LessonId = string  // e.g. "1.3", "6.5"
export type ChapterId = number // 1–7

export interface ValidationResult {
  pass: boolean
  hint?: string
}

export interface Lesson {
  id: LessonId
  title: string
  concept: string          // one-line description for progress map
  instructions: string     // max 60 words, plain language, no jargon
  scaffold: string         // real Strudel code, max 6 lines, verified against official docs
  hints: string[]          // 2–3 hints: [vague, more specific, near-answer]
  spotlightTarget?: string // CSS selector string, e.g. '[aria-label="Play"]'
  validator: (code: string) => ValidationResult
}

export interface Chapter {
  id: ChapterId
  emoji: string
  title: string
  description: string
  lessons: Lesson[]
}

export const UNLOCK_THRESHOLD = 0.6 // 60% completion unlocks next chapter
```

---

## Validator Patterns Reference

Validators use regex against the raw editor code string. They must be **tolerant of whitespace and formatting**, checking for structural presence only — not exact code matches.

| Concept | Regex Pattern | Notes |
|---|---|---|
| `s()` used | `/s\s*\(/.test(code)` | |
| 3+ tokens in s() | `/(s\s*\(["'\`][^"'\`]+\s+[^"'\`]+\s+[^"'\`]+)/.test(code)` | |
| `.bank()` | `/\.bank\s*\(/.test(code)` | |
| `[]` sub-sequence | `/["'\`][^"'\`]*\[[^"'\`]*/.test(code)` | |
| `*N` speed | `/\*\d/.test(code)` | |
| `~` rest | `/["'\`][^"'\`]*~/.test(code)` | |
| `<>` angle brackets | `/</.test(code) && />/.test(code)` | |
| `,` parallel | `/["'\`][^"'\`]*,[^"'\`]*["'\`]/.test(code)` | |
| `@N` elongation | `/@\d/.test(code)` | |
| `!N` replication | `/!\d/.test(code)` | |
| Euclidean `(N,N)` | `/\(\d+,\d+/.test(code)` | |
| `note()` used | `/note\s*\(/.test(code)` | |
| Octave notation | `/[a-g][0-9]/i.test(code)` | |
| `n()` + `.scale()` | `/n\s*\(/.test(code) && /\.scale\s*\(/.test(code)` | |
| `.voicings()` | `/\.voicings\s*\(/.test(code)` | |
| `stack()` | `/stack\s*\(/.test(code)` | |
| `.slow()` or `.fast()` | `/\.(slow\|fast)\s*\(/.test(code)` | |
| Code comment | `/\/\//.test(code)` | |
| Waveform synth | `/\.s\s*\(\s*["'\`](sawtooth\|square\|triangle\|sine)/.test(code)` | |
| ADSR | `/\.(attack\|decay\|sustain\|release)\s*\(/.test(code)` | |
| `.gain()` | `/\.gain\s*\(/.test(code)` | |
| `.speed()` | `/\.speed\s*\(/.test(code)` | |
| `.cutoff()` or `.lpf()` | `/\.(cutoff\|lpf)\s*\(/.test(code)` | |
| Noise source | `/["'\`](white\|pink\|brown)["'\`]/.test(code)` | |
| `.room()` | `/\.room\s*\(/.test(code)` | |
| `.delay()` | `/\.delay\s*\(/.test(code)` | |
| `.shape()` or `.crush()` | `/\.(shape\|crush)\s*\(/.test(code)` | |
| `.pan()` | `/\.pan\s*\(/.test(code)` | |
| 3+ FX chained | `count matches of /\.(room\|delay\|shape\|pan\|cutoff\|reverb)\s*\(/g >= 3` | |
| `sine` signal | `/\bsine\b/.test(code)` | |
| `perlin` + `.range()` | `/\bperlin\b/.test(code) && /\.range\s*\(/.test(code)` | |
| `?` probability | `/["'\`][^"'\`]*\?/.test(code)` | |
| `.sometimes()` etc. | `/\.(sometimes\|rarely\|often)\s*\(/.test(code)` | |

---

## useTutorial.ts — State Hook

### State Shape

```typescript
interface TutorialState {
  isOpen: boolean
  activeTab: 'chat' | 'learn'         // owned by ChatPanel, lifted here for convenience
  activeChapterId: ChapterId
  activeLessonId: LessonId
  completedLessons: Set<LessonId>
  showProgressMap: boolean
  hintLevel: number                    // 0 = hidden, 1 = first hint, 2 = second, 3 = third
  lastActivity: number                 // Date.now() timestamp, reset on editor change
}
```

### Exposed API

```typescript
interface UseTutorialReturn {
  // State
  state: TutorialState
  currentLesson: Lesson
  currentChapter: Chapter
  chapterProgress: { completed: number; total: number }
  isChapterUnlocked: (chapterId: ChapterId) => boolean
  incompleteCount: number              // total lessons not yet completed, for badge

  // Actions
  openTutorial: (lessonId?: LessonId) => void
  closeTutorial: () => void
  setActiveTab: (tab: 'chat' | 'learn') => void
  nextLesson: () => void
  prevLesson: () => void
  completeLesson: (lessonId: LessonId) => void
  getScaffold: (lessonId: LessonId) => string
  validateLesson: (lessonId: LessonId, code: string) => ValidationResult
  revealNextHint: () => void
  resetActivityTimer: () => void       // call this from editor onChange
  resetTutorial: () => void            // clears progress + overlay dismissal state
  openProgressMap: () => void
  closeProgressMap: () => void
}
```

### localStorage Persistence

```typescript
// Keys
const STORAGE_KEY = 'shoedelussy:tutorialProgress'

// Shape stored
interface PersistedState {
  activeChapterId: ChapterId
  activeLessonId: LessonId
  completedLessons: LessonId[]         // Array (Set is not JSON-serializable)
  seenOverlays: LessonId[]
}

// Read on init — wrap in try/catch for corrupted JSON
const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')

// Overlay helpers also use:
// - localStorage['shoedelussy:seenOverlays']
// - localStorage['shoedelussy:overlaysDisabled']
// - localStorage['shoedelussy:overlayDismissCount']

// Write on change — debounced 500ms
// Use a ref for the debounce timer — NOT a new setTimeout every render
const debounceRef = useRef<ReturnType<typeof setTimeout>>()
const persist = useCallback((state: PersistedState) => {
  clearTimeout(debounceRef.current)
  debounceRef.current = setTimeout(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, 500)
}, [])
```

### Auto-Hint Timer

```typescript
// In useTutorial — runs every 5 seconds, reveals hint if inactive for 30s
useEffect(() => {
  const interval = setInterval(() => {
    if (Date.now() - state.lastActivity > 30_000 && state.hintLevel < currentLesson.hints.length) {
      revealNextHint()
    }
  }, 5_000)
  return () => clearInterval(interval)
}, [state.lastActivity, state.hintLevel, currentLesson])
```

### Editor Activity Note

`lastActivity` should be reset from real editor input events.

When playback is already running, editor input may also trigger a separate debounced live re-evaluation path so typed changes become audible without requiring a manual stop/start cycle.

---

## index.ts — Barrel Export

```typescript
export { default as TutorialPanel } from './TutorialPanel'
export { default as TutorialOverlay } from './TutorialOverlay'
export { default as TutorialProgress } from './TutorialProgress'
export { useTutorial } from './useTutorial'
export { chapters, FUNCTION_LESSON_MAP } from './tutorialData'
export type { Lesson, Chapter, LessonId, ChapterId, ValidationResult } from './tutorialData'
```
