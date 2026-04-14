import { forwardRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { FolderKanban, Shuffle, Sparkles, Waves, Wand2 } from 'lucide-react'
import StrudelEditor, { type CycleInfo } from '@/components/StrudelEditor'
import ArrangePanel from '@/components/ArrangePanel'
import FxRack from '@/components/FxRack'
import HalVisualization from '@/components/HalVisualization'
import RhythmGenerator from '@/components/RhythmGenerator'
import SectionStrip from '@/components/SectionStrip'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { parseTrackGains } from '@/lib/codeParser'
import type { TrackGain } from '@/lib/codeParser'
import type { ExtractedParam, Project, SectionMarker } from '@/types/project'

export interface EditorBridge {
  play: () => void
  stop: () => void
  evaluate: () => void
  undo: () => void
  redo: () => void
  setCode: (code: string) => void
  getCode: () => string
  getCycleInfo: () => CycleInfo | null
  jumpToLine: (line: number) => void
}

interface EditorPanelProps {
  project: Project
  sections: SectionMarker[]
  activeSection: string | null
  params: ExtractedParam[]
  isPlaying: boolean
  isEditorInitialized: boolean
  isEditorInitializing: boolean
  cycleInfo: CycleInfo | null
  shareUrl: string | null
  pendingPatchCount: number
  rhythmCollapsed: boolean
  arrangeCollapsed: boolean
  fxCollapsed: boolean
  onToggleRhythm: () => void
  onToggleArrange: () => void
  onToggleFx: () => void
  onEditorReady: (bridge: Partial<EditorBridge>) => void
  onCodeChange: (code: string) => void
  onPlayStateChange: (isPlaying: boolean) => void
  onInitStateChange: (initialized: boolean, initializing: boolean) => void
  onStrudelError: (error: string) => void
  onCodeEvaluated: () => void
  onSelectSection: (section: SectionMarker) => void
  onTrackGainChange: (trackGain: TrackGain, value: number) => void
  onTrackGainCommit: (trackGain: TrackGain, value: number) => void
  onTrackPanChange: (trackGain: TrackGain, value: number) => void
  onTrackPanCommit: (trackGain: TrackGain, value: number) => void
  onInjectCode: (snippet: string) => void
  onApplyCode: (code: string) => void
  onShuffleRhythm: () => void
  onAddVariation: () => void
  onRandomReverb: () => void
  onJuxRev: () => void
}

type Tab = 'mixer' | 'rhythm' | 'arrange' | 'fx' | 'info'

const TAB_LABELS: { id: Tab; label: string }[] = [
  { id: 'mixer', label: 'Mixer' },
  { id: 'rhythm', label: 'Rhythm' },
  { id: 'arrange', label: 'Arrange' },
  { id: 'fx', label: 'FX' },
  { id: 'info', label: 'Info' },
]

const EditorPanel = forwardRef<HTMLDivElement, EditorPanelProps>((
  {
    project, sections, activeSection, params, isPlaying,
    isEditorInitialized, isEditorInitializing, cycleInfo, shareUrl,
    pendingPatchCount,
    onToggleRhythm, onToggleArrange, onToggleFx,
    onEditorReady, onCodeChange, onPlayStateChange, onInitStateChange,
    onStrudelError, onCodeEvaluated, onSelectSection,
    onTrackGainChange, onTrackGainCommit, onTrackPanChange, onTrackPanCommit,
    onInjectCode, onApplyCode,
    onShuffleRhythm, onAddVariation, onRandomReverb, onJuxRev,
  },
  editorContainerRef,
) => {
  const [activeTab, setActiveTab] = useState<Tab>('mixer')
  const trackGains = parseTrackGains(project.strudel_code)

  return (
    <div className="flex h-full min-h-0 gap-3">

      {/* ── LEFT COLUMN: editor + section strip ── */}
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div
          ref={editorContainerRef}
          className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-zinc-900 bg-gradient-to-br from-zinc-950 via-[#090909] to-zinc-950 p-2 sm:p-4"
        >
          <StrudelEditor
            initialCode={project.strudel_code}
            onCodeChange={onCodeChange}
            onPlayReady={(play) => onEditorReady({ play })}
            onStopReady={(stop) => onEditorReady({ stop })}
            onUndoReady={(undo) => onEditorReady({ undo })}
            onRedoReady={(redo) => onEditorReady({ redo })}
            onGetCurrentCode={(getCode) => onEditorReady({ getCode })}
            onEvaluateReady={(evaluate) => onEditorReady({ evaluate })}
            onSetCodeReady={(setCode) => onEditorReady({ setCode })}
            onCycleInfoReady={(getCycleInfo) => onEditorReady({ getCycleInfo })}
            onJumpToLineReady={(jumpToLine) => onEditorReady({ jumpToLine })}
            onPlayStateChange={onPlayStateChange}
            onInitStateChange={onInitStateChange}
            onStrudelError={(error) => onStrudelError(error)}
            onCodeEvaluated={onCodeEvaluated}
          />
        </div>

        <Card className="shrink-0 border-zinc-900 bg-black/40 shadow-none">
          <CardContent className="space-y-3 p-3">
            <SectionStrip
              sections={sections}
              activeSection={activeSection}
              code={project.strudel_code}
              onSelect={onSelectSection}
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-900" onClick={onShuffleRhythm}>
                <Shuffle className="mr-1.5 h-3.5 w-3.5" /> Shuffle
              </Button>
              <Button variant="outline" size="sm" className="border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-900" onClick={onAddVariation}>
                <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Variation
              </Button>
              <Button variant="outline" size="sm" className="border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-900" onClick={onRandomReverb}>
                <Waves className="mr-1.5 h-3.5 w-3.5" /> Reverb
              </Button>
              <Button variant="outline" size="sm" className="border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-900" onClick={onJuxRev}>
                <Wand2 className="mr-1.5 h-3.5 w-3.5" /> Jux Rev
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── RIGHT COLUMN: tabbed DAW panels ── */}
      <div className="flex w-[300px] shrink-0 flex-col gap-0 rounded-2xl border border-zinc-900 bg-black/50 xl:w-[320px]">

        {/* Tab bar */}
        <div className="flex shrink-0 border-b border-zinc-900">
          {TAB_LABELS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-1 py-2.5 text-[11px] font-medium uppercase tracking-[0.14em] transition-colors ${
                activeTab === tab.id
                  ? 'border-b-2 border-purple-500 text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="min-h-0 flex-1 overflow-y-auto p-3">

          {/* MIXER TAB */}
          {activeTab === 'mixer' && (
            <div className="space-y-2">
              <p className="text-xs text-zinc-500 pb-1">Per-track volume &amp; pan. Edits live in the code.</p>
              {trackGains.length === 0 ? (
                <p className="rounded-xl border border-dashed border-zinc-800 px-3 py-4 text-sm text-zinc-500 text-center">No tracks detected yet.</p>
              ) : (
                trackGains.map((tg) => (
                  <div key={tg.trackId} className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-3">
                    <div className="flex items-center justify-between text-sm text-zinc-100">
                      <span className="truncate max-w-[140px] font-medium" title={tg.trackName}>{tg.trackName}</span>
                      <span className="text-zinc-400 text-xs tabular-nums">{tg.gain.toFixed(2)}</span>
                    </div>
                    <input
                      type="range" min={0} max={1.5} step={0.01} value={tg.gain}
                      onChange={(e) => onTrackGainChange(tg, Number(e.target.value))}
                      onPointerUp={(e) => onTrackGainCommit(tg, Number((e.currentTarget as HTMLInputElement).value))}
                      onKeyUp={(e) => { if (['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) onTrackGainCommit(tg, Number((e.currentTarget as HTMLInputElement).value)) }}
                      className="mt-1.5 w-full accent-purple-500"
                    />
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-widest text-zinc-600">Pan</span>
                      <span className="text-zinc-500 text-xs tabular-nums">{tg.pan.toFixed(2)}</span>
                    </div>
                    <input
                      type="range" min={-1} max={1} step={0.01} value={tg.pan}
                      onChange={(e) => onTrackPanChange(tg, Number(e.target.value))}
                      onPointerUp={(e) => onTrackPanCommit(tg, Number((e.currentTarget as HTMLInputElement).value))}
                      className="mt-1 w-full accent-cyan-500"
                    />
                  </div>
                ))
              )}
            </div>
          )}

          {/* RHYTHM TAB */}
          {activeTab === 'rhythm' && (
            <RhythmGenerator collapsed={false} onToggle={onToggleRhythm} onInjectCode={onInjectCode} />
          )}

          {/* ARRANGE TAB */}
          {activeTab === 'arrange' && (
            <ArrangePanel code={project.strudel_code} collapsed={false} onToggle={onToggleArrange} onApplyCode={onApplyCode} />
          )}

          {/* FX TAB */}
          {activeTab === 'fx' && (
            <FxRack code={project.strudel_code} collapsed={false} onToggle={onToggleFx} onApplyCode={onApplyCode} />
          )}

          {/* INFO TAB */}
          {activeTab === 'info' && (
            <div className="space-y-3">
              <div className="h-[160px] overflow-hidden rounded-2xl border border-zinc-900">
                <HalVisualization isPlaying={isPlaying} isListening={false} />
              </div>
              <p className="text-xs text-zinc-500">Project telemetry</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-xl border border-zinc-800 bg-black/50 p-3">
                  <div className="text-xs uppercase tracking-[0.16em] text-zinc-500">Engine</div>
                  <div className="mt-1 text-zinc-100">{isEditorInitializing ? 'Booting...' : isEditorInitialized ? 'Ready' : 'Waiting'}</div>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-black/50 p-3">
                  <div className="text-xs uppercase tracking-[0.16em] text-zinc-500">Cycle</div>
                  <div className="mt-1 text-zinc-100">{cycleInfo ? `${Math.round(cycleInfo.phase * 100)}%` : '0%'}</div>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-black/50 p-3">
                  <div className="text-xs uppercase tracking-[0.16em] text-zinc-500">Sections</div>
                  <div className="mt-1 text-zinc-100">{sections.length}</div>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-black/50 p-3">
                  <div className="text-xs uppercase tracking-[0.16em] text-zinc-500">Params</div>
                  <div className="mt-1 text-zinc-100">{params.length}</div>
                </div>
              </div>
              {shareUrl ? (
                <p className="rounded-xl border border-cyan-900 bg-cyan-950/40 px-3 py-2 text-xs text-cyan-200 break-all">{shareUrl}</p>
              ) : null}
              <div className="flex items-center justify-between pt-1">
                <Button asChild variant="outline" className="border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-900">
                  <Link to="/projects">
                    <FolderKanban className="mr-2 h-4 w-4" />
                    Projects
                  </Link>
                </Button>
                <span className="text-xs text-zinc-500 text-right">
                  {pendingPatchCount > 0 ? `${pendingPatchCount} patch${pendingPatchCount === 1 ? '' : 'es'} pending` : 'No pending patch'}
                </span>
              </div>
            </div>
          )}

        </div>
      </div>

    </div>
  )
})

EditorPanel.displayName = 'EditorPanel'

export default EditorPanel
