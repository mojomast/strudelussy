import { useCallback, useRef } from 'react'
import { Disc3 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ProjectTopbarProps {
  projectName: string
  bpm?: number
  musicalKey?: string
  onProjectNameChange: (name: string) => void
  onBpmChange: (bpm: number) => void
  onKeyChange: (key: string) => void
  onNewProject: () => void
  onLoadDemo: () => void
  onExportTxt: () => void
  onExportProject: () => void
  onShare: () => void
  onToggleShortcuts: () => void
}

const ProjectTopbar = ({
  projectName,
  bpm,
  musicalKey,
  onProjectNameChange,
  onBpmChange,
  onKeyChange,
  onNewProject,
  onLoadDemo,
  onExportTxt,
  onExportProject,
  onShare,
  onToggleShortcuts,
}: ProjectTopbarProps) => {
  const tapTimesRef = useRef<number[]>([])

  const handleTapTempo = useCallback(() => {
    const now = Date.now()
    const recent = tapTimesRef.current.filter((timestamp) => now - timestamp <= 3000)
    const next = [...recent, now]
    tapTimesRef.current = next

    if (next.length < 3) return

    const intervals = next.slice(1).map((timestamp, index) => timestamp - next[index])
    const averageInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length
    const bpm = Math.round(60000 / averageInterval)
    onBpmChange(Math.min(240, Math.max(40, bpm)))
  }, [onBpmChange])

  return (
    <header className="rounded-2xl border border-zinc-900 bg-black/60 px-3 py-3 backdrop-blur-xl sm:px-4 sm:py-4">
      <div className="flex min-w-0 flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
        <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-cyan-500 text-black shadow-[0_0_30px_rgba(139,92,246,0.25)]">
              <Disc3 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">strudelussy</p>
              <p className="text-sm text-zinc-300">AI-powered Strudel DAW workspace</p>
            </div>
          </div>

          <input
            value={projectName}
            onChange={(event) => onProjectNameChange(event.target.value)}
            className="min-w-0 rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-2.5 text-base font-semibold text-white outline-none transition focus:border-purple-500 xl:min-w-[280px]"
          />
        </div>

        <div className="flex min-w-0 flex-col gap-3 2xl:items-end">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-900" onClick={onNewProject}>
              New Project
            </Button>
            <Button variant="outline" className="border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-900" onClick={onLoadDemo}>
              Load Demo
            </Button>
            <Button variant="outline" className="border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-900" onClick={onExportTxt}>
              Export .txt
            </Button>
            <Button variant="outline" className="border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-900" onClick={onExportProject}>
              Export .strudel
            </Button>
            <Button variant="outline" className="border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-900" onClick={onShare}>
              Share
            </Button>
            <Button variant="outline" className="border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-900" onClick={onToggleShortcuts}>
              Shortcuts
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-400">
              BPM
              <input
                type="number"
                value={bpm ?? ''}
                onChange={(event) => onBpmChange(Number(event.target.value) || 120)}
                className="w-20 bg-transparent text-right text-white outline-none"
              />
            </label>
            <Button variant="outline" size="sm" className="border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-900" onClick={handleTapTempo}>
              Tap
            </Button>
            <input
              value={musicalKey ?? ''}
              onChange={(event) => onKeyChange(event.target.value)}
              placeholder="Key / scale"
              className="min-w-[128px] rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-500"
            />
          </div>
        </div>
      </div>
    </header>
  )
}

export default ProjectTopbar
