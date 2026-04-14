import { forwardRef } from 'react'
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
  onParamChange: (param: ExtractedParam, nextValue: number) => void
  onParamCommit: (param: ExtractedParam, nextValue: number) => void
  onInjectCode: (snippet: string) => void
  onApplyCode: (code: string) => void
  onShuffleRhythm: () => void
  onAddVariation: () => void
  onRandomReverb: () => void
  onJuxRev: () => void
}

const EditorPanel = forwardRef<HTMLDivElement, EditorPanelProps>(({
  project,
  sections,
  activeSection,
  params,
  isPlaying,
  isEditorInitialized,
  isEditorInitializing,
  cycleInfo,
  shareUrl,
  pendingPatchCount,
  rhythmCollapsed,
  arrangeCollapsed,
  fxCollapsed,
  onToggleRhythm,
  onToggleArrange,
  onToggleFx,
  onEditorReady,
  onCodeChange,
  onPlayStateChange,
  onInitStateChange,
  onStrudelError,
  onCodeEvaluated,
  onSelectSection,
  onParamChange,
  onParamCommit,
  onInjectCode,
  onApplyCode,
  onShuffleRhythm,
  onAddVariation,
  onRandomReverb,
  onJuxRev,
}, editorContainerRef) => {
  return (
    <Card className="min-h-0 flex-1 border-zinc-900 bg-black/55 text-white shadow-none">
      <CardContent className="grid h-full min-h-0 gap-3 overflow-hidden p-2 sm:p-3 2xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="flex flex-col gap-3 overflow-auto pr-1 pb-4">
          <div
            ref={editorContainerRef}
            className="h-[48vh] min-h-[400px] overflow-hidden rounded-2xl border border-zinc-900 bg-gradient-to-br from-zinc-950 via-[#090909] to-zinc-950 p-2 sm:p-4 xl:h-[52vh] xl:min-h-[480px]"
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

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)]">
            <div className="space-y-3">
              <Card className="border-zinc-900 bg-black/40 shadow-none">
                <CardContent className="space-y-3 p-3 sm:p-4">
                  <div>
                    <p className="text-sm font-semibold">Section strip</p>
                    <p className="text-xs text-zinc-500">Comment markers map to clickable DAW regions and editor jumps.</p>
                  </div>
                  <SectionStrip sections={sections} activeSection={activeSection} code={project.strudel_code} onSelect={onSelectSection} />
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" className="border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-900" onClick={onShuffleRhythm}>
                      <Shuffle className="mr-2 h-4 w-4" />
                      Shuffle Rhythm
                    </Button>
                    <Button variant="outline" size="sm" className="border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-900" onClick={onAddVariation}>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Add Variation
                    </Button>
                    <Button variant="outline" size="sm" className="border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-900" onClick={onRandomReverb}>
                      <Waves className="mr-2 h-4 w-4" />
                      Random Reverb
                    </Button>
                    <Button variant="outline" size="sm" className="border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-900" onClick={onJuxRev}>
                      <Wand2 className="mr-2 h-4 w-4" />
                      Jux Rev
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <RhythmGenerator collapsed={rhythmCollapsed} onToggle={onToggleRhythm} onInjectCode={onInjectCode} />
              <ArrangePanel code={project.strudel_code} collapsed={arrangeCollapsed} onToggle={onToggleArrange} onApplyCode={onApplyCode} />
              <FxRack code={project.strudel_code} collapsed={fxCollapsed} onToggle={onToggleFx} onApplyCode={onApplyCode} />
            </div>

            <Card className="min-h-0 border-zinc-900 bg-black/40 shadow-none">
              <CardContent className="flex h-full min-h-0 flex-col space-y-3 p-3 sm:p-4">
                <div>
                  <p className="text-sm font-semibold">Detected parameters</p>
                  <p className="text-xs text-zinc-500">Adjust detected values and patch the live code in-place.</p>
                </div>
                <div className="min-h-0 flex-1 space-y-2 overflow-auto pr-1">
                  {params.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-zinc-800 px-3 py-3 text-sm text-zinc-500">No tweakable parameters detected yet.</p>
                  ) : (
                    params.slice(0, 6).map((param) => (
                      <div key={param.id} className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-3">
                        <div className="flex items-center justify-between text-sm text-zinc-100">
                          <span>{param.label}</span>
                          <span className="text-zinc-400">{param.value.toFixed(3).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1')}</span>
                        </div>
                        <input
                          type="range"
                          min={param.min}
                          max={param.max}
                          step={param.kind === 'cps' ? 0.01 : 0.05}
                          value={param.value}
                          onChange={(event) => onParamChange(param, Number(event.target.value))}
                          onPointerUp={(event) => onParamCommit(param, Number((event.currentTarget as HTMLInputElement).value))}
                          onKeyUp={(event) => {
                            if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
                              onParamCommit(param, Number((event.currentTarget as HTMLInputElement).value))
                            }
                          }}
                          className="mt-3 w-full accent-purple-500"
                        />
                        <div className="mt-2 flex items-center justify-between text-[11px] uppercase tracking-[0.14em] text-zinc-500">
                          <span>{param.min}</span>
                          <span>{param.kind}</span>
                          <span>{param.max}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="hidden min-h-0 2xl:flex flex-col gap-3 overflow-hidden">
          <div className="h-[200px] overflow-hidden rounded-2xl border border-zinc-900 3xl:h-[260px]">
            <HalVisualization isPlaying={isPlaying} isListening={false} />
          </div>

          <Card className="min-h-0 flex-1 border-zinc-900 bg-zinc-950/80 text-white shadow-none">
            <CardContent className="space-y-3 p-4">
              <div>
                <p className="text-sm font-semibold">Project telemetry</p>
                <p className="text-xs text-zinc-500">Parsed directly from the live Strudel code and transport state.</p>
              </div>
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
              {shareUrl ? <p className="rounded-xl border border-cyan-900 bg-cyan-950/40 px-3 py-2 text-xs text-cyan-200">Share URL: {shareUrl}</p> : null}
              <div className="flex items-center justify-between pt-2">
                <Button asChild variant="outline" className="border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-900">
                  <Link to="/projects">
                    <FolderKanban className="mr-2 h-4 w-4" />
                    Projects
                  </Link>
                </Button>
                <span className="text-xs text-zinc-500">
                  {pendingPatchCount > 0 ? `${pendingPatchCount} AI patch${pendingPatchCount === 1 ? '' : 'es'} awaiting review` : 'No pending patch'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  )
})

EditorPanel.displayName = 'EditorPanel'

export default EditorPanel
