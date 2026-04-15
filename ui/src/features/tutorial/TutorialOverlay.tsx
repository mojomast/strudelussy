/**
 * // What changed:
 * // - Added spotlight overlays for the first tutorial lessons
 * // - Implemented cutout highlighting, dismissal persistence, and permanent disable logic
 */

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import type { Lesson } from './tutorialData'

interface TutorialOverlayProps {
  lesson: Lesson
  isOpen: boolean
}

const SEEN_KEY = 'strudelussy:seenOverlays'
const DISABLED_KEY = 'strudelussy:overlaysDisabled'

const readSeenOverlays = (): string[] => {
  try {
    const raw = localStorage.getItem(SEEN_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as string[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const overlaysDisabled = (): boolean => {
  try {
    return localStorage.getItem(DISABLED_KEY) === 'true'
  } catch {
    return false
  }
}

const TutorialOverlay = ({ lesson, isOpen }: TutorialOverlayProps) => {
  const [tick, setTick] = useState(0)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    setDismissed(false)
  }, [lesson.id])

  useEffect(() => {
    if (!isOpen || !lesson.spotlightTarget || (lesson.id !== '1.1' && lesson.id !== '1.4')) {
      return
    }

    const target = document.querySelector(lesson.spotlightTarget)
    if (!target) {
      return
    }

    const observer = new ResizeObserver(() => setTick((value) => value + 1))
    observer.observe(target)

    const handleResize = () => setTick((value) => value + 1)
    window.addEventListener('resize', handleResize)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', handleResize)
    }
  }, [isOpen, lesson.id, lesson.spotlightTarget])

  const rect = useMemo(() => {
    if (!isOpen || !lesson.spotlightTarget || (lesson.id !== '1.1' && lesson.id !== '1.4')) {
      return null
    }
    if (dismissed || overlaysDisabled()) {
      return null
    }
    const seen = readSeenOverlays()
    if (seen.includes(lesson.id)) {
      return null
    }
    const target = document.querySelector(lesson.spotlightTarget)
    return target instanceof HTMLElement ? target.getBoundingClientRect() : null
  }, [dismissed, isOpen, lesson.id, lesson.spotlightTarget, tick])

  if (!rect) {
    return null
  }

  const dismissOverlay = () => {
    setDismissed(true)
    try {
      const next = Array.from(new Set([...readSeenOverlays(), lesson.id]))
      localStorage.setItem(SEEN_KEY, JSON.stringify(next))
      if (next.length >= 3) {
        localStorage.setItem(DISABLED_KEY, 'true')
      }
    } catch {
      // Keep overlay state in memory if storage is unavailable.
    }
  }

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          top: rect.top - 8,
          left: rect.left - 8,
          width: rect.width + 16,
          height: rect.height + 16,
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 0 0 100vmax oklch(0 0 0 / 0.7)',
          pointerEvents: 'auto',
        }}
      />
      <div
        className="max-w-xs rounded-[var(--radius-lg)] border border-[var(--ussy-divider)] bg-[var(--ussy-surface-2)] p-4 text-left text-sm text-[var(--ussy-text)] shadow-lg"
        style={{ position: 'absolute', top: rect.bottom + 12, left: rect.left, pointerEvents: 'auto' }}
      >
        <p>{lesson.hints[0]}</p>
        <Button
          type="button"
          size="sm"
          className="mt-3 bg-[var(--ussy-accent)] text-black hover:bg-[var(--ussy-accent-bright)]"
          onClick={dismissOverlay}
          aria-label="Dismiss tutorial spotlight"
        >
          Got it
        </Button>
      </div>
    </div>,
    document.body,
  )
}

export default TutorialOverlay
