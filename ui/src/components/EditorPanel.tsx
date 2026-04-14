import { forwardRef } from 'react'
import { Shuffle, Sparkles, Waves, Wand2 } from 'lucide-react'
import StrudelEditor, { type CycleInfo } from '@/components/StrudelEditor'
import SectionStrip from '@/components/SectionStrip'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { Project, SectionMarker } from '@/types/project'

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
  isPlaying: boolean
  isEditorInitialized: boolean
  isEditorInitializing: boolean
  cycleInfo: CycleInfo | null
  onEditorReady: (bridge: Partial<EditorBridge>) => void
  onCodeChange: (code: string) => void
  onPlayStateChange: (isPlaying: boolean) => void
  onInitStateChange: (initialized: boolean, initializing: boolean) => void
  onStrudelError: (error: string) => void
  onCodeEvaluated: () => void
  onSelectSection: (section: SectionMarker) => void
  onShuffleRhythm: () => void
  onAddVariation: () => void
  onRandomReverb: () => void
  onJuxRev: () => void
}

const EditorPanel = forwardRef<HTMLDivElement, EditorPanelProps>((
  {
    project, sections, activeSection,
    onEditorReady, onCodeChange, onPlayStateChange, onInitStateChange,
    onStrudelError, onCodeEvaluated, onSelectSection,
    onShuffleRhythm, onAddVariation, onRandomReverb, onJuxRev,
  },
  editorContainerRef,
) => {
  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div
        ref={editorContainerRef}
        className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-zinc-900 bg-gradient-to-br from-zinc-950 via-[#090909] to-zinc-950 p-2 sm:p-3"
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
        <CardContent className="space-y-2 p-3">
          <SectionStrip
            sections={sections}
            activeSection={activeSection}
            code={project.strudel_code}
            onSelect={onSelectSection}
          />
          <div className="flex flex-wrap gap-1.5">
            <Button variant="outline" size="sm" className="h-7 border-zinc-700 bg-transparent px-2 text-xs text-zinc-200 hover:bg-zinc-900" onClick={onShuffleRhythm}>
              <Shuffle className="mr-1 h-3 w-3" /> Shuffle
            </Button>
            <Button variant="outline" size="sm" className="h-7 border-zinc-700 bg-transparent px-2 text-xs text-zinc-200 hover:bg-zinc-900" onClick={onAddVariation}>
              <Sparkles className="mr-1 h-3 w-3" /> Variation
            </Button>
            <Button variant="outline" size="sm" className="h-7 border-zinc-700 bg-transparent px-2 text-xs text-zinc-200 hover:bg-zinc-900" onClick={onRandomReverb}>
              <Waves className="mr-1 h-3 w-3" /> Reverb
            </Button>
            <Button variant="outline" size="sm" className="h-7 border-zinc-700 bg-transparent px-2 text-xs text-zinc-200 hover:bg-zinc-900" onClick={onJuxRev}>
              <Wand2 className="mr-1 h-3 w-3" /> Jux Rev
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
})

EditorPanel.displayName = 'EditorPanel'

export default EditorPanel
