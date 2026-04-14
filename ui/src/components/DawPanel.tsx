import { Link } from 'react-router-dom'
import { FolderKanban } from 'lucide-react'
import ArrangePanel from '@/components/ArrangePanel'
import FxRack from '@/components/FxRack'
import HalVisualization from '@/components/HalVisualization'
import RhythmGenerator from '@/components/RhythmGenerator'
import { Button } from '@/components/ui/button'
import { parseTrackGains } from '@/lib/codeParser'
import type { TrackGain } from '@/lib/codeParser'
import type { CycleInfo } from '@/components/StrudelEditor'
import type { ExtractedParam, Project, SectionMarker } from '@/types/project'

interface DawPanelProps {
  project: Project
  sections: SectionMarker[]
  params: ExtractedParam[]
  isPlaying: boolean
  isEditorInitialized: boolean
  isEditorInitializing: boolean
  cycleInfo: CycleInfo | null
  shareUrl: string | null
  pendingPatchCount: number
  onTrackGainChange: (tg: TrackGain, value: number) => void
  onTrackGainCommit: (tg: TrackGain, value: number) => void
  onTrackPanChange: (tg: TrackGain, value: number) => void
  onTrackPanCommit: (tg: TrackGain, value: number) => void
  onInjectCode: (snippet: string) => void
  onApplyCode: (code: string) => void
}

const DawPanel = ({
  project, sections, params, isPlaying, isEditorInitialized, isEditorInitializing,
  cycleInfo, pendingPatchCount,
  onTrackGainChange, onTrackGainCommit, onTrackPanChange, onTrackPanCommit,
  onInjectCode, onApplyCode,
}: DawPanelProps) => {
  const trackGains = parseTrackGains(project.strudel_code)

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">

      {/* Visualization */}
      <div className="h-[200px] shrink-0 overflow-hidden rounded-t-2xl border-b border-zinc-900">
        <HalVisualization isPlaying={isPlaying} isListening={false} />
      </div>

      <div className="flex flex-col gap-0 divide-y divide-zinc-900 p-3 space-y-3">

        {/* Telemetry row */}
        <div className="grid grid-cols-4 gap-2 pb-3 text-center text-xs">
          <div className="rounded-lg border border-zinc-800 bg-black/50 py-2">
            <div className="uppercase tracking-widest text-zinc-600 text-[9px]">Engine</div>
            <div className="mt-0.5 text-zinc-200 text-[11px]">{isEditorInitializing ? 'Boot' : isEditorInitialized ? 'Ready' : 'Wait'}</div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-black/50 py-2">
            <div className="uppercase tracking-widest text-zinc-600 text-[9px]">Cycle</div>
            <div className="mt-0.5 text-zinc-200 text-[11px]">{cycleInfo ? `${Math.round(cycleInfo.phase * 100)}%` : '0%'}</div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-black/50 py-2">
            <div className="uppercase tracking-widest text-zinc-600 text-[9px]">§</div>
            <div className="mt-0.5 text-zinc-200 text-[11px]">{sections.length}</div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-black/50 py-2">
            <div className="uppercase tracking-widest text-zinc-600 text-[9px]">Params</div>
            <div className="mt-0.5 text-zinc-200 text-[11px]">{params.length}</div>
          </div>
        </div>

        {/* Track Mixer */}
        <div className="space-y-2 pt-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Mixer</p>
          {trackGains.length === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-800 px-3 py-3 text-center text-xs text-zinc-600">No tracks detected</p>
          ) : (
            trackGains.map((tg) => (
              <div key={tg.trackId} className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <span className="max-w-[160px] truncate text-sm font-medium text-zinc-100" title={tg.trackName}>{tg.trackName}</span>
                  <span className="tabular-nums text-xs text-zinc-400">{tg.gain.toFixed(2)}</span>
                </div>
                <input type="range" min={0} max={1.5} step={0.01} value={tg.gain}
                  onChange={(e) => onTrackGainChange(tg, Number(e.target.value))}
                  onPointerUp={(e) => onTrackGainCommit(tg, Number((e.currentTarget as HTMLInputElement).value))}
                  className="mt-1.5 w-full accent-purple-500" />
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-widest text-zinc-600">Pan</span>
                  <span className="tabular-nums text-xs text-zinc-500">{tg.pan.toFixed(2)}</span>
                </div>
                <input type="range" min={-1} max={1} step={0.01} value={tg.pan}
                  onChange={(e) => onTrackPanChange(tg, Number(e.target.value))}
                  onPointerUp={(e) => onTrackPanCommit(tg, Number((e.currentTarget as HTMLInputElement).value))}
                  className="mt-1 w-full accent-cyan-500" />
              </div>
            ))
          )}
        </div>

        {/* Rhythm Generator */}
        <div className="pt-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-400">Rhythm Generator</p>
          <RhythmGenerator collapsed={false} onToggle={() => {}} onInjectCode={onInjectCode} />
        </div>

        {/* Arrange */}
        <div className="pt-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-400">Arrange</p>
          <ArrangePanel code={project.strudel_code} collapsed={false} onToggle={() => {}} onApplyCode={onApplyCode} />
        </div>

        {/* FX Rack */}
        <div className="pt-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-400">FX Rack</p>
          <FxRack code={project.strudel_code} collapsed={false} onToggle={() => {}} onApplyCode={onApplyCode} />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3">
          <Button asChild variant="outline" size="sm" className="h-7 border-zinc-700 bg-transparent px-2 text-xs text-zinc-300 hover:bg-zinc-900">
            <Link to="/projects"><FolderKanban className="mr-1.5 h-3 w-3" /> Projects</Link>
          </Button>
          <span className="text-right text-xs text-zinc-600">
            {pendingPatchCount > 0 ? `${pendingPatchCount} patch${pendingPatchCount === 1 ? '' : 'es'} pending` : 'No pending patch'}
          </span>
        </div>

      </div>
    </div>
  )
}

export default DawPanel
