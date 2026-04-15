/**
 * DawPanel — Collapsible accordion sidebar for the DAW workspace.
 *
 * Changes from the previous flat-scroll layout:
 * - All content sections (Mixer, Rhythm Generator, Arrange, FX Rack, Version History)
 *   are now collapsible accordion sections with animated expand/collapse.
 * - BPM, Key, and Telemetry rows removed from this component (moved to topbar).
 *   Props are preserved in the interface so nothing breaks upstream.
 * - Section open/closed state is persisted in localStorage.
 * - "Collapse All / Expand All" toggle button at the top.
 * - Styling migrated to --ussy-* CSS custom property tokens.
 * - Reusable SectionHeader inner component with full a11y support.
 */

import { Link } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import { FolderKanban, Sliders, Disc, LayoutGrid, SlidersHorizontal, Clock, ChevronDown, ChevronsUpDown } from 'lucide-react'
import ArrangePanel from '@/components/ArrangePanel'
import FxRack from '@/components/FxRack'
import RhythmGenerator from '@/components/RhythmGenerator'
import { Button } from '@/components/ui/button'
import { parseTrackGains } from '@/lib/codeParser'
import type { TrackGain } from '@/lib/codeParser'
import type { CycleInfo } from '@/components/StrudelEditor'
import type { ExtractedParam, Project, SectionMarker } from '@/types/project'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DawPanelProps {
  project: Project
  sections: SectionMarker[]
  params: ExtractedParam[]
  isEditorInitialized: boolean
  isEditorInitializing: boolean
  cycleInfo: CycleInfo | null
  onBpmChange: (bpm: number) => void
  onKeyChange: (key: string) => void
  shareUrl: string | null
  shareError: string | null
  isSharing: boolean
  pendingPatchCount: number
  onTrackGainChange: (tg: TrackGain, value: number) => void
  onTrackGainCommit: (tg: TrackGain, value: number) => void
  onTrackPanChange: (tg: TrackGain, value: number) => void
  onTrackPanCommit: (tg: TrackGain, value: number) => void
  onInjectCode: (snippet: string) => void
  onApplyCode: (code: string) => void
}

interface SectionHeaderProps {
  icon: React.ReactNode
  label: string
  badge?: number | string
  isOpen: boolean
  onToggle: () => void
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'strudelussy:sidebarSections'

type SectionId = 'mixer' | 'rhythm' | 'arrange' | 'fx' | 'versionHistory'

const DEFAULT_OPEN_STATE: Record<SectionId, boolean> = {
  mixer: true,
  rhythm: false,
  arrange: false,
  fx: false,
  versionHistory: false,
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Read persisted section state from localStorage, falling back to defaults. */
function loadSectionState(): Record<SectionId, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') {
        // Merge with defaults so newly-added sections get a sensible value
        return { ...DEFAULT_OPEN_STATE, ...(parsed as Record<string, boolean>) }
      }
    }
  } catch {
    // Corrupted or unavailable — fall through to defaults
  }
  return { ...DEFAULT_OPEN_STATE }
}

/** Persist section state to localStorage. */
function saveSectionState(state: Record<SectionId, boolean>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

// ---------------------------------------------------------------------------
// SectionHeader
// ---------------------------------------------------------------------------

function SectionHeader({ icon, label, badge, isOpen, onToggle }: SectionHeaderProps) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onToggle()
      }
    },
    [onToggle],
  )

  return (
    <div
      role="button"
      aria-expanded={isOpen}
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={handleKeyDown}
      className="flex cursor-pointer select-none items-center gap-2 border-b border-[var(--ussy-divider)] px-3 py-2.5 transition-colors hover:bg-[var(--ussy-surface-2)]"
    >
      {/* Icon */}
      <span className="flex-shrink-0 text-[var(--ussy-text-muted)]">{icon}</span>

      {/* Label */}
      <span className="flex-1 text-xs font-semibold uppercase tracking-widest text-[var(--ussy-text)]">
        {label}
      </span>

      {/* Optional badge */}
      {badge !== undefined && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--ussy-surface-2)] px-1.5 text-[10px] font-medium tabular-nums text-[var(--ussy-text-muted)]">
          {badge}
        </span>
      )}

      {/* Chevron — rotates when open */}
      <ChevronDown
        className={`ussy-chevron h-4 w-4 flex-shrink-0 text-[var(--ussy-text-faint)] transition-transform duration-200 ${
          isOpen ? 'ussy-chevron-open rotate-180' : ''
        }`}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// AnimatedSection — wraps content with max-height animation
// ---------------------------------------------------------------------------

function AnimatedSection({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) {
  return (
    <div
      className="overflow-hidden transition-[max-height] duration-200 ease-out"
      style={{ maxHeight: isOpen ? '2000px' : '0px' }}
    >
      <div className="p-3">{children}</div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// DawPanel
// ---------------------------------------------------------------------------

const DawPanel = ({
  project,
  shareUrl,
  shareError,
  isSharing,
  pendingPatchCount,
  onTrackGainChange,
  onTrackGainCommit,
  onTrackPanChange,
  onTrackPanCommit,
  onInjectCode,
  onApplyCode,
}: DawPanelProps) => {
  // ---- Section open/closed state with localStorage persistence ----
  const [openSections, setOpenSections] = useState<Record<SectionId, boolean>>(loadSectionState)

  // Persist whenever openSections changes (after initial load)
  useEffect(() => {
    saveSectionState(openSections)
  }, [openSections])

  const toggleSection = useCallback((id: SectionId) => {
    setOpenSections((prev) => {
      const next = { ...prev, [id]: !prev[id] }
      return next
    })
  }, [])

  // Stable per-section toggle callbacks for memoized child components
  const toggleMixer = useCallback(() => toggleSection('mixer'), [toggleSection])
  const toggleRhythm = useCallback(() => toggleSection('rhythm'), [toggleSection])
  const toggleArrange = useCallback(() => toggleSection('arrange'), [toggleSection])
  const toggleFx = useCallback(() => toggleSection('fx'), [toggleSection])
  const toggleVersionHistory = useCallback(() => toggleSection('versionHistory'), [toggleSection])

  // Stable no-op for collapsed/onToggle props that are preserved but unused
  const noop = useCallback(() => {}, [])

  // ---- Collapse All / Expand All ----
  const allOpen = Object.values(openSections).every(Boolean)

  const toggleAll = useCallback(() => {
    const target = !allOpen
    setOpenSections((prev) => {
      const next = { ...prev }
      for (const key of Object.keys(next) as SectionId[]) {
        next[key] = target
      }
      return next
    })
  }, [allOpen])

  // ---- Derived data ----
  const trackGains = parseTrackGains(project.strudel_code)

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      {/* ---- Collapse / Expand All ---- */}
      <div className="flex items-center justify-end border-b border-[var(--ussy-divider)] px-3 py-1.5">
        <button
          type="button"
          onClick={toggleAll}
          className="flex items-center gap-1 text-[11px] text-[var(--ussy-text-muted)] transition-colors hover:text-[var(--ussy-text)]"
        >
          <ChevronsUpDown className="h-3.5 w-3.5" />
          {allOpen ? 'Collapse All' : 'Expand All'}
        </button>
      </div>

      {/* ---- Accordion sections ---- */}
      <div className="flex-1">
        {/* 1. Mixer */}
        <SectionHeader
          icon={<Sliders className="h-4 w-4" />}
          label="Mixer"
          badge={trackGains.length}
          isOpen={openSections.mixer}
          onToggle={toggleMixer}
        />
        <AnimatedSection isOpen={openSections.mixer}>
          {trackGains.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[var(--ussy-divider)] px-3 py-3 text-center text-xs text-[var(--ussy-text-faint)]">
              No tracks detected
            </p>
          ) : (
            <div className="space-y-2">
              {trackGains.map((tg) => (
                <div
                  key={tg.trackId}
                  className="rounded-xl border border-[var(--ussy-divider)] bg-[var(--ussy-surface-2)] px-3 py-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="max-w-[160px] truncate text-sm font-medium text-[var(--ussy-text)]"
                      title={tg.trackName}
                    >
                      {tg.trackName}
                    </span>
                    <span className="tabular-nums text-xs text-[var(--ussy-text-muted)]">
                      {tg.gain.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1.5}
                    step={0.01}
                    value={tg.gain}
                    onChange={(e) => onTrackGainChange(tg, Number(e.target.value))}
                    onPointerUp={(e) =>
                      onTrackGainCommit(tg, Number((e.currentTarget as HTMLInputElement).value))
                    }
                    className="mt-1.5 w-full accent-[var(--ussy-accent)]"
                    aria-label={`${tg.trackName} gain`}
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-widest text-[var(--ussy-text-faint)]">
                      Pan
                    </span>
                    <span className="tabular-nums text-xs text-[var(--ussy-text-muted)]">
                      {tg.pan.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-1}
                    max={1}
                    step={0.01}
                    value={tg.pan}
                    onChange={(e) => onTrackPanChange(tg, Number(e.target.value))}
                    onPointerUp={(e) =>
                      onTrackPanCommit(tg, Number((e.currentTarget as HTMLInputElement).value))
                    }
                    className="mt-1 w-full accent-[var(--ussy-accent)]"
                    aria-label={`${tg.trackName} pan`}
                  />
                </div>
              ))}
            </div>
          )}
        </AnimatedSection>

        {/* 2. Rhythm Generator */}
        <SectionHeader
          icon={<Disc className="h-4 w-4" />}
          label="Rhythm Generator"
          isOpen={openSections.rhythm}
          onToggle={toggleRhythm}
        />
        <AnimatedSection isOpen={openSections.rhythm}>
          <RhythmGenerator collapsed={false} onToggle={noop} onInjectCode={onInjectCode} />
        </AnimatedSection>

        {/* 3. Arrange */}
        <SectionHeader
          icon={<LayoutGrid className="h-4 w-4" />}
          label="Arrange"
          isOpen={openSections.arrange}
          onToggle={toggleArrange}
        />
        <AnimatedSection isOpen={openSections.arrange}>
          <ArrangePanel
            code={project.strudel_code}
            collapsed={false}
            onToggle={noop}
            onApplyCode={onApplyCode}
          />
        </AnimatedSection>

        {/* 4. FX Rack */}
        <SectionHeader
          icon={<SlidersHorizontal className="h-4 w-4" />}
          label="FX Rack"
          isOpen={openSections.fx}
          onToggle={toggleFx}
        />
        <AnimatedSection isOpen={openSections.fx}>
          <FxRack
            code={project.strudel_code}
            collapsed={false}
            onToggle={noop}
            onApplyCode={onApplyCode}
          />
        </AnimatedSection>

        {/* 5. Version History (placeholder — real content rendered by DAWShell) */}
        <SectionHeader
          icon={<Clock className="h-4 w-4" />}
          label="Version History"
          isOpen={openSections.versionHistory}
          onToggle={toggleVersionHistory}
        />
        <AnimatedSection isOpen={openSections.versionHistory}>
          <p className="text-xs text-[var(--ussy-text-faint)]">
            Version history is displayed in the parent shell.
          </p>
        </AnimatedSection>
      </div>

      {/* ---- Footer (always visible, outside accordion) ---- */}
      <div className="space-y-2 border-t border-[var(--ussy-divider)] p-3">
        {shareUrl ? (
          <div className="rounded-xl border border-emerald-700/40 bg-emerald-950/20 px-3 py-2 text-xs text-emerald-200">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">Shared</span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 border-emerald-700/50 bg-transparent px-2 text-xs text-emerald-100 hover:bg-emerald-900/40"
                onClick={() => {
                  if (navigator.clipboard?.writeText) {
                    void navigator.clipboard.writeText(shareUrl)
                  }
                }}
              >
                Copy link
              </Button>
            </div>
            <div className="mt-1 truncate text-emerald-100/80">{shareUrl}</div>
          </div>
        ) : null}

        {shareError ? (
          <div className="rounded-xl border border-amber-700/40 bg-amber-950/20 px-3 py-2 text-xs text-amber-200">
            {shareError}
          </div>
        ) : null}

        <div className="flex items-center justify-between">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-7 border-[var(--ussy-divider)] bg-transparent px-2 text-xs text-[var(--ussy-text-muted)] hover:bg-[var(--ussy-surface-2)]"
          >
            <Link to="/projects">
              <FolderKanban className="mr-1.5 h-3 w-3" /> Projects
            </Link>
          </Button>
          <span className="text-right text-xs text-[var(--ussy-text-faint)]">
            {isSharing
              ? 'Sharing...'
              : pendingPatchCount > 0
                ? `${pendingPatchCount} patch${pendingPatchCount === 1 ? '' : 'es'} pending`
                : 'No pending patch'}
          </span>
        </div>
      </div>
    </div>
  )
}

export default DawPanel
