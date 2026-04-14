import { Check, Disc3, PauseCircle, Play, Save, Undo2, Redo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ProjectTopbarProps {
  projectName: string
  bpm?: number
  musicalKey?: string
  isPlaying: boolean
  isSaving: boolean
  isDirty: boolean
  error: string | null
  onProjectNameChange: (name: string) => void
  onBpmChange: (bpm: number) => void
  onKeyChange: (key: string) => void
  onPlay: () => void
  onStop: () => void
  onSave: () => void
  onUndo: () => void
  onRedo: () => void
  onExportTxt: () => void
  onExportProject: () => void
  onShare: () => void
}

const ProjectTopbar = ({
  projectName,
  bpm,
  musicalKey,
  isPlaying,
  isSaving,
  isDirty,
  error,
  onProjectNameChange,
  onBpmChange,
  onKeyChange,
  onPlay,
  onStop,
  onSave,
  onUndo,
  onRedo,
  onExportTxt,
  onExportProject,
  onShare,
}: ProjectTopbarProps) => {
  return (
    <header className="rounded-2xl border border-zinc-900 bg-black/60 px-4 py-4 backdrop-blur-xl">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
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
            className="min-w-0 rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-lg font-semibold text-white outline-none transition focus:border-purple-500"
          />
        </div>

        <div className="flex flex-col gap-3 xl:items-end">
          <div className="flex flex-wrap items-center gap-2">
            <Button className="gap-2 bg-purple-600 text-white hover:bg-purple-500" onClick={isPlaying ? onStop : onPlay}>
              {isPlaying ? <PauseCircle className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {isPlaying ? 'Stop' : 'Play'}
            </Button>
            <Button variant="outline" className="border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-900" onClick={onUndo}>
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-900" onClick={onRedo}>
              <Redo2 className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-900" onClick={onSave}>
              {isDirty ? <Save className="h-4 w-4" /> : <Check className="h-4 w-4 text-emerald-400" />}
              {isSaving ? 'Saving...' : isDirty ? 'Save Version' : 'Saved'}
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
            <input
              value={musicalKey ?? ''}
              onChange={(event) => onKeyChange(event.target.value)}
              placeholder="Key / scale"
              className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-500"
            />
            <span className={`rounded-full px-3 py-2 text-xs ${error ? 'bg-red-950/70 text-red-300' : 'bg-zinc-950 text-zinc-400'}`}>
              {error ? `Error: ${error}` : 'Engine ready'}
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}

export default ProjectTopbar
