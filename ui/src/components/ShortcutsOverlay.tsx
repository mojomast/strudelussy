import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface ShortcutsOverlayProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const shortcuts = [
  { key: 'Space', action: 'Play / Stop' },
  { key: 'Cmd/Ctrl+S', action: 'Save snapshot' },
  { key: 'Cmd/Ctrl+Enter', action: 'Send message in chat' },
  { key: '?', action: 'Toggle this help overlay' },
  { key: 'Escape', action: 'Close overlay / stop preview' },
]

const ShortcutsOverlay = ({ open, onOpenChange }: ShortcutsOverlayProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl border-zinc-800 bg-zinc-950 text-white">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Fast controls for playback, chat, snapshots, and preview management.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-hidden rounded-xl border border-zinc-800 bg-black/50">
          {shortcuts.map((shortcut) => (
            <div key={shortcut.key} className="grid grid-cols-[160px_1fr] border-b border-zinc-800 px-4 py-3 last:border-b-0">
              <span className="font-mono text-sm text-purple-300">{shortcut.key}</span>
              <span className="text-sm text-zinc-200">{shortcut.action}</span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ShortcutsOverlay
