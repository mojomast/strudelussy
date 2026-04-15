/* ============================================================================
   DAWShell.tsx — Refactored layout shell (Ussy Mode)
   
   What changed:
   - CSS Grid with CSS custom properties (--chat-width, --daw-width) for
     resize-handle-driven panel widths
   - Left/right panel collapse via chevron buttons (collapse to 40px icon rail)
   - Focus mode: Cmd+Shift+F hides topbar and both sidebars
   - Resize handles on chat panel right edge and daw panel left edge
   - Version history moved OUT of center column, into daw sidebar accordion
   - Viz panel remains conditional in center column
   - Transport bar is a slim bottom dock
   - All transitions use the motion contract from index.css
   ============================================================================ */

import { type ReactNode, useState, useCallback, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, MessageSquare, Sliders, Maximize2, Minimize2 } from 'lucide-react'
import VersionHistoryPanel from '@/components/VersionHistoryPanel'

interface DAWShellProps {
  topbar: ReactNode
  chatPanel: ReactNode
  editorPanel: ReactNode
  vizPanel: ReactNode | null
  showVisualization?: boolean
  dawPanel: ReactNode
  transportBar: ReactNode
  versionPanel: React.ComponentProps<typeof VersionHistoryPanel>
  overlay?: ReactNode
}

const CHAT_MIN = 260
const CHAT_DEFAULT = 320
const CHAT_MAX = 500
const DAW_MIN = 280
const DAW_DEFAULT = 380
const DAW_MAX = 520
const COLLAPSED_WIDTH = 40

const DAWShell = ({
  topbar,
  chatPanel,
  editorPanel,
  vizPanel,
  showVisualization = true,
  dawPanel,
  transportBar,
  versionPanel,
  overlay,
}: DAWShellProps) => {
  const [chatWidth, setChatWidth] = useState(CHAT_DEFAULT)
  const [dawWidth, setDawWidth] = useState(DAW_DEFAULT)
  const [chatCollapsed, setChatCollapsed] = useState(false)
  const [dawCollapsed, setDawCollapsed] = useState(false)
  const [focusMode, setFocusMode] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef<'chat' | 'daw' | null>(null)

  // Resize handler for chat panel (right edge)
  const handleChatResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDraggingRef.current = 'chat'
    const startX = e.clientX
    const startWidth = chatWidth

    const onMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX
      const newWidth = Math.min(CHAT_MAX, Math.max(CHAT_MIN, startWidth + delta))
      setChatWidth(newWidth)
    }

    const onUp = () => {
      isDraggingRef.current = null
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [chatWidth])

  // Resize handler for daw panel (left edge)
  const handleDawResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDraggingRef.current = 'daw'
    const startX = e.clientX
    const startWidth = dawWidth

    const onMove = (moveEvent: MouseEvent) => {
      const delta = startX - moveEvent.clientX
      const newWidth = Math.min(DAW_MAX, Math.max(DAW_MIN, startWidth + delta))
      setDawWidth(newWidth)
    }

    const onUp = () => {
      isDraggingRef.current = null
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [dawWidth])

  // Focus mode keyboard shortcut
  useEffect(() => {
    /** Returns true if the keyboard event target is an editable element (text input, textarea, select, or contenteditable). */
    const isEditableTarget = (e: KeyboardEvent): boolean => {
      const target = e.target
      if (!(target instanceof HTMLElement)) return false
      return (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target.isContentEditable ||
        target.closest('[contenteditable="true"]') !== null
      )
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl+Shift+F: toggle focus mode
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'F') {
        e.preventDefault()
        setFocusMode((f) => !f)
      }
      // ESC: exit focus mode
      if (e.key === 'Escape' && focusMode) {
        setFocusMode(false)
      }
      // [ : toggle left panel (only when not typing)
      if (e.key === '[' && !e.metaKey && !e.ctrlKey && !isEditableTarget(e)) {
        setChatCollapsed((c) => !c)
      }
      // ] : toggle right panel (only when not typing)
      if (e.key === ']' && !e.metaKey && !e.ctrlKey && !isEditableTarget(e)) {
        setDawCollapsed((c) => !c)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [focusMode])

  const effectiveChatWidth = focusMode ? 0 : chatCollapsed ? COLLAPSED_WIDTH : chatWidth
  const effectiveDawWidth = focusMode ? 0 : dawCollapsed ? COLLAPSED_WIDTH : dawWidth

  return (
    <>
      <main
        ref={containerRef}
        className={`h-screen overflow-hidden px-2 py-2 text-white sm:px-3 sm:py-3 ${focusMode ? 'focus-mode' : ''}`}
        style={{ backgroundColor: 'var(--ussy-bg)' }}
      >
        <div className="flex h-full min-h-0 flex-col gap-1.5">

          {/* Topbar — hidden in focus mode */}
          {!focusMode && (
            <div className="ussy-topbar shrink-0">
              {topbar}
            </div>
          )}

          {/* Main 3-column grid */}
          <div
            className="ussy-panel-transition grid min-h-0 flex-1 gap-0 overflow-hidden"
            style={{
              gridTemplateColumns: `${effectiveChatWidth}px 6px 1fr 6px ${effectiveDawWidth}px`,
            }}
          >

            {/* LEFT: Chat Panel or collapsed icon rail */}
            {!focusMode && (
              <>
                <div className="ussy-sidebar-left relative min-h-0 overflow-hidden">
                  {chatCollapsed ? (
                    <div className="ussy-icon-rail h-full rounded-xl border border-[var(--ussy-divider)] bg-[var(--ussy-surface)]">
                      <button
                        onClick={() => setChatCollapsed(false)}
                        className="ussy-hover-transition flex h-8 w-8 items-center justify-center rounded-lg text-[var(--ussy-text-muted)] hover:bg-[var(--ussy-surface-2)] hover:text-[var(--ussy-text)]"
                        aria-label="Expand chat panel"
                        title="Expand chat panel"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                      <div className="flex h-8 w-8 items-center justify-center text-[var(--ussy-text-faint)]">
                        <MessageSquare className="h-4 w-4" />
                      </div>
                    </div>
                  ) : (
                    <div className="relative flex h-full min-h-0 flex-col">
                      <button
                        onClick={() => setChatCollapsed(true)}
                        className="ussy-hover-transition absolute right-2 top-2 z-20 flex h-6 w-6 items-center justify-center rounded-md text-[var(--ussy-text-faint)] hover:bg-[var(--ussy-surface-2)] hover:text-[var(--ussy-text)]"
                        aria-label="Collapse chat panel"
                        title="Collapse chat panel"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </button>
                      {chatPanel}
                    </div>
                  )}
                </div>

                {/* Chat resize handle */}
                <div
                  className="ussy-resize-handle"
                  onMouseDown={chatCollapsed ? undefined : handleChatResizeStart}
                  role="separator"
                  tabIndex={0}
                  aria-orientation="vertical"
                  aria-valuenow={chatWidth}
                  aria-valuemin={CHAT_MIN}
                  aria-valuemax={CHAT_MAX}
                  aria-label="Resize chat panel"
                />
              </>
            )}
            {focusMode && (
              <>
                <div />
                <div />
              </>
            )}

            {/* CENTER: Editor + Viz + Transport */}
            <section className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden">
              {/* Editor fills available space */}
              <div className="min-h-0 flex-1 overflow-hidden">
                {editorPanel}
              </div>

              {/* Viz panel (collapsible) */}
              {showVisualization && vizPanel ? (
                <div className="h-48 shrink-0 overflow-hidden rounded-xl border border-[var(--ussy-divider)] bg-black/40">
                  {vizPanel}
                </div>
              ) : null}

              {/* Transport bar — slim bottom dock */}
              <div className="shrink-0">
                {transportBar}
              </div>
            </section>

            {/* DAW resize handle */}
            {!focusMode && (
              <>
                <div
                  className="ussy-resize-handle"
                  onMouseDown={dawCollapsed ? undefined : handleDawResizeStart}
                  role="separator"
                  tabIndex={0}
                  aria-orientation="vertical"
                  aria-valuenow={dawWidth}
                  aria-valuemin={DAW_MIN}
                  aria-valuemax={DAW_MAX}
                  aria-label="Resize DAW panel"
                />

                {/* RIGHT: DAW Panel or collapsed icon rail */}
                <aside className="ussy-sidebar-right min-h-0 overflow-hidden">
                  {dawCollapsed ? (
                    <div className="ussy-icon-rail h-full rounded-xl border border-[var(--ussy-divider)] bg-[var(--ussy-surface)]">
                      <button
                        onClick={() => setDawCollapsed(false)}
                        className="ussy-hover-transition flex h-8 w-8 items-center justify-center rounded-lg text-[var(--ussy-text-muted)] hover:bg-[var(--ussy-surface-2)] hover:text-[var(--ussy-text)]"
                        aria-label="Expand DAW panel"
                        title="Expand DAW panel"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <div className="flex h-8 w-8 items-center justify-center text-[var(--ussy-text-faint)]">
                        <Sliders className="h-4 w-4" />
                      </div>
                    </div>
                  ) : (
                    <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-[var(--ussy-divider)] bg-[var(--ussy-surface)]">
                      <button
                        onClick={() => setDawCollapsed(true)}
                        className="ussy-hover-transition absolute left-2 top-2 z-20 flex h-6 w-6 items-center justify-center rounded-md text-[var(--ussy-text-faint)] hover:bg-[var(--ussy-surface-2)] hover:text-[var(--ussy-text)]"
                        aria-label="Collapse DAW panel"
                        title="Collapse DAW panel"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                      <div className="flex h-full min-h-0 flex-col overflow-y-auto">
                        {dawPanel}
                        {/* Version History inside DAW sidebar */}
                        <div className="border-t border-[var(--ussy-divider)] p-3">
                          <VersionHistoryPanel {...versionPanel} />
                        </div>
                      </div>
                    </div>
                  )}
                </aside>
              </>
            )}
            {focusMode && (
              <>
                <div />
                <div />
              </>
            )}
          </div>

          {/* Focus mode toggle — always visible as floating button */}
          <button
            onClick={() => setFocusMode((f) => !f)}
            className="ussy-hover-transition fixed bottom-14 right-4 z-50 flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--ussy-divider)] bg-[var(--ussy-surface-2)] text-[var(--ussy-text-muted)] shadow-lg hover:bg-[var(--ussy-surface-3)] hover:text-[var(--ussy-text)]"
            aria-label="Toggle focus mode"
            title={focusMode ? 'Exit focus mode (Cmd+Shift+F)' : 'Enter focus mode (Cmd+Shift+F)'}
          >
            {focusMode ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </main>
      {overlay}
    </>
  )
}

export default DAWShell
