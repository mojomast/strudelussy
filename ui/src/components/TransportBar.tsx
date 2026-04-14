import { Check, PauseCircle, Play, Redo2, Save, Sparkles, Undo2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import VisualizationBar from '@/components/VisualizationBar'
import { Button } from '@/components/ui/button'

interface TransportBarProps {
  isPlaying: boolean
  isSaving: boolean
  isDirty: boolean
  phase: number
  error: string | null
  activeSection: string | null
  onPlay: () => void
  onStop: () => void
  onSave: () => void
  onUndo: () => void
  onRedo: () => void
}

const TransportBar = ({
  isPlaying,
  isSaving,
  isDirty,
  phase,
  error,
  activeSection,
  onPlay,
  onStop,
  onSave,
  onUndo,
  onRedo,
}: TransportBarProps) => {
  return (
    <Card className="min-h-0 border-zinc-900 bg-black/55 text-white shadow-none lg:col-span-2 2xl:col-span-1">
      <CardContent className="space-y-3 p-3 sm:p-4">
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
          <span className={`max-w-full truncate rounded-full px-3 py-2 text-xs ${error ? 'bg-red-950/70 text-red-300' : 'bg-zinc-950 text-zinc-400'}`}>
            {error ? `Error: ${error}` : 'Engine ready'}
          </span>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold">Section strip</p>
            <p className="text-xs text-zinc-500">Comment markers map to clickable DAW regions.</p>
          </div>
          <div className="flex items-center gap-2 self-start rounded-full bg-zinc-950 px-3 py-1.5 text-xs text-zinc-400">
            <Sparkles className="h-3.5 w-3.5 text-purple-300" />
            {activeSection ? `Focused on ${activeSection}` : 'AI diff review enabled'}
          </div>
        </div>

        <div className="hidden md:block">
          <VisualizationBar isPlaying={isPlaying} phase={phase} />
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-zinc-900">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 transition-all duration-100"
            style={{ width: `${Math.max(3, phase * 100)}%` }}
          />
        </div>
      </CardContent>
    </Card>
  )
}

export default TransportBar
