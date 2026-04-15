/**
 * // What changed:
 * // - Added the tutorial panel shortcut to the overlay list
 */

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ShortcutsOverlayProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface Shortcut {
  key: string
  action: string
}

interface ShortcutGroup {
  label: string
  shortcuts: Shortcut[]
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const shortcutGroups: ShortcutGroup[] = [
  {
    label: 'Playback & Editing',
    shortcuts: [
      { key: 'Space', action: 'Play / Stop' },
      { key: 'Cmd/Ctrl+S', action: 'Save snapshot' },
      { key: 'Escape', action: 'Close overlay / stop preview / exit focus mode' },
    ],
  },
  {
    label: 'Chat',
    shortcuts: [
      { key: 'Cmd/Ctrl+Enter', action: 'Send message in chat' },
    ],
  },
  {
    label: 'UI Panels',
      shortcuts: [
        { key: '[', action: 'Collapse / expand left panel (Chat)' },
        { key: ']', action: 'Collapse / expand right panel (DAW)' },
        { key: 'Cmd/Ctrl+Shift+F', action: 'Toggle focus mode' },
        { key: 'Cmd/Ctrl+Shift+T', action: 'Toggle Tutorial Panel' },
        { key: 'Cmd/Ctrl+Shift+L', action: 'Toggle Legacy / Ussy UI mode' },
      ],
  },
  {
    label: 'Settings',
    shortcuts: [
      { key: 'Cmd/Ctrl+,', action: 'Open / close settings drawer' },
      { key: '?', action: 'Toggle this help overlay' },
    ],
  },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ShortcutsOverlay = ({ open, onOpenChange }: ShortcutsOverlayProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl border-[var(--ussy-divider)] bg-[var(--ussy-surface)] text-[var(--ussy-text)]">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription className="text-[var(--ussy-text-muted)]">
            Fast controls for playback, chat, snapshots, and preview management.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-hidden rounded-xl border border-[var(--ussy-divider)]">
          {shortcutGroups.map((group) => (
            <div key={group.label}>
              {/* Section label */}
              <div className="border-b border-[var(--ussy-divider)] bg-[var(--ussy-surface-2)]/50 px-4 py-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--ussy-text-muted)]">
                  {group.label}
                </span>
              </div>

              {/* Shortcut rows */}
              {group.shortcuts.map((shortcut, idx) => (
                <div
                  key={shortcut.key}
                  className={
                    'grid grid-cols-[160px_1fr] bg-[var(--ussy-surface-2)]/50 px-4 py-3' +
                    (idx < group.shortcuts.length - 1
                      ? ' border-b border-[var(--ussy-divider)]'
                      : '')
                  }
                >
                  <span className="font-mono text-sm text-[var(--ussy-accent)]">
                    {shortcut.key}
                  </span>
                  <span className="text-sm text-[var(--ussy-text-muted)]">
                    {shortcut.action}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ShortcutsOverlay
