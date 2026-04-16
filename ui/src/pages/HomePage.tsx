/**
 * HomePage – root page for the Strudelussy DAW.
 *
 * // What changed:
 * // - Wired the tutorial feature at the page level via useTutorial()
 * // - Passed tutorial props into ChatPanel and rendered TutorialOverlay at the shell root
 * // - Added Cmd/Ctrl+Shift+T handling to toggle the Learn tab
 */

import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import ChatPanel from '@/components/ChatPanel'
import DAWShell from '@/components/DAWShell'
import DawPanel from '@/components/DawPanel'
import EditorPanel from '@/components/EditorPanel'
import LegacyDAWShell from '@/components/LegacyDAWShell'
import ProjectTopbar from '@/components/ProjectTopbar'
import ShortcutsOverlay from '@/components/ShortcutsOverlay'
import TransportBar from '@/components/TransportBar'
import { TutorialOverlay, useTutorial } from '@/features/tutorial'
import { useChatOrchestrator } from '@/hooks/useChatOrchestrator'

const HalVisualization = lazy(() => import('@/components/HalVisualization'))

type UIMode = 'ussy' | 'legacy'

const HomePage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [showVisualization, setShowVisualization] = useState(true)
  const [uiMode, setUiMode] = useState<UIMode>('ussy')

  const orchestrator = useChatOrchestrator({ searchParams, setSearchParams })
  const tutorial = useTutorial()

  const toggleUiMode = useCallback(() => {
    setUiMode((prev) => (prev === 'ussy' ? 'legacy' : 'ussy'))
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'l') {
        e.preventDefault()
        toggleUiMode()
      }

      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 't') {
        e.preventDefault()
        if (tutorial.state.activeTab === 'learn') {
          tutorial.setActiveTab('chat')
        } else {
          tutorial.openTutorial()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleUiMode, tutorial])

  if (orchestrator.isLoadingProject || !orchestrator.currentProject) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--ussy-bg)] text-[var(--ussy-text-muted)]">
        Loading project...
      </main>
    )
  }

  const { currentProject, sections, params, pendingDiffs, isPlaying } = orchestrator
  const pendingPatchCount = pendingDiffs.size

  const versionPanelProps = {
    versions: currentProject.versions,
    isLoading: orchestrator.isLoadingVersions,
    isRestoring: orchestrator.isRestoringVersion,
    error: orchestrator.versionError,
    onRefresh: () => void orchestrator.loadVersions(currentProject.id),
    onRestore: (version: Parameters<typeof orchestrator.onRestoreVersion>[0]) =>
      void orchestrator.onRestoreVersion(version),
  } as const

  const shellProps = {
    topbar: (
      <ProjectTopbar
        projectName={orchestrator.currentProject.name}
        masterVolume={orchestrator.masterVolume}
        customApiEndpoint={orchestrator.customApiEndpoint}
        customApiKey={orchestrator.customApiKey}
        customSystemPrompt={orchestrator.customSystemPrompt}
        promptPresetName={orchestrator.promptPresetName}
        savedPromptPresets={orchestrator.savedPromptPresets}
        selectedModel={orchestrator.selectedModel}
        systemPromptMode={orchestrator.systemPromptMode}
        availableModels={orchestrator.availableModels}
        isLoadingModels={orchestrator.isLoadingModels}
        modelLoadError={orchestrator.modelLoadError}
        isSharing={orchestrator.isSharing}
        approxTokenUsage={orchestrator.approxTokenUsage}
        showVisualization={showVisualization}
        bpm={currentProject.bpm ?? null}
        projectKey={currentProject.key ?? null}
        onProjectNameChange={orchestrator.onProjectNameChange}
        onMasterVolumeChange={orchestrator.onMasterVolumeChange}
        onCustomApiEndpointChange={orchestrator.onCustomApiEndpointChange}
        onCustomApiKeyChange={orchestrator.onCustomApiKeyChange}
        onCustomSystemPromptChange={orchestrator.onCustomSystemPromptChange}
        onLoadDefaultPromptTemplate={orchestrator.onLoadDefaultPromptTemplate}
        onLoadImprovedPromptTemplate={orchestrator.onLoadImprovedPromptTemplate}
        onPromptPresetNameChange={orchestrator.onPromptPresetNameChange}
        onSavePromptPreset={orchestrator.onSavePromptPreset}
        onLoadSavedPromptPreset={orchestrator.onLoadSavedPromptPreset}
        onModelChange={orchestrator.onModelChange}
        onSystemPromptModeChange={orchestrator.onSystemPromptModeChange}
        onLoadModels={() => void orchestrator.onLoadModels()}
        onToggleVisualization={() => setShowVisualization((value) => !value)}
        onNewProject={() => orchestrator.onLoadTemplateProject('empty')}
        onLoadDemo={() => orchestrator.onLoadTemplateProject('demo')}
        onExportTxt={orchestrator.onExportTxt}
        onExportProject={orchestrator.onExportProject}
        onShare={() => void orchestrator.onShare()}
        onToggleShortcuts={() => orchestrator.setShowShortcuts(!orchestrator.showShortcuts)}
        onBpmChange={orchestrator.onBpmChange}
        onKeyChange={orchestrator.onProjectKeyChange}
      />
    ),
    chatPanel: (
      <ChatPanel
        messages={orchestrator.chatMessages}
        isSending={orchestrator.isSending}
        statusText={orchestrator.chatStatus}
        errorText={orchestrator.chatError}
        yoloMode={orchestrator.yoloMode}
        onSend={orchestrator.onSend}
        onRetryLast={orchestrator.onRetryLast}
        onToggleYolo={() => orchestrator.setYoloMode(!orchestrator.yoloMode)}
        onApplyDiff={(messageId, diff) => void orchestrator.onApplyDiff(messageId, diff)}
        onRejectDiff={(messageId) => orchestrator.onRejectDiff(messageId)}
        onPreviewDiff={orchestrator.onPreviewDiff}
        onStopPreview={(messageId) => orchestrator.onStopPreview(messageId)}
        tutorial={{
          onInjectCode: orchestrator.onInjectCode,
          getEditorCode: orchestrator.getCurrentCode,
          state: tutorial.state,
          currentLesson: tutorial.currentLesson,
          currentChapter: tutorial.currentChapter,
          chapterProgress: tutorial.chapterProgress,
          isChapterUnlocked: tutorial.isChapterUnlocked,
          incompleteCount: tutorial.incompleteCount,
          nextLesson: tutorial.nextLesson,
          prevLesson: tutorial.prevLesson,
          completeLesson: tutorial.completeLesson,
          validateLesson: tutorial.validateLesson,
          revealNextHint: tutorial.revealNextHint,
          resetActivityTimer: tutorial.resetActivityTimer,
          resetTutorial: tutorial.resetTutorial,
          openProgressMap: tutorial.openProgressMap,
          closeProgressMap: tutorial.closeProgressMap,
          openTutorial: tutorial.openTutorial,
        }}
        activeTab={tutorial.state.activeTab}
        onActiveTabChange={tutorial.setActiveTab}
        incompleteCount={tutorial.incompleteCount}
        openTutorial={tutorial.openTutorial}
      />
    ),
    editorPanel: (
      <EditorPanel
        ref={orchestrator.editorContainerRef}
        project={currentProject}
        sections={sections}
        activeSection={orchestrator.activeSection}
        isPlaying={isPlaying}
        showVisualization={showVisualization}
        audioAnalyser={orchestrator.audioAnalyser}
        isEditorInitialized={orchestrator.isEditorInitialized}
        isEditorInitializing={orchestrator.isEditorInitializing}
        cycleInfo={orchestrator.cycleInfo}
        onEditorReady={orchestrator.registerEditor}
        onAnalyserReady={orchestrator.onEditorAnalyserReady}
        onCodeChange={(code) => {
          orchestrator.onEditorCodeChange(code)
        }}
        onEditorActivity={() => {
          tutorial.resetActivityTimer()
          orchestrator.onEditorActivity()
        }}
        onPlayStateChange={orchestrator.onEditorPlayStateChange}
        onInitStateChange={orchestrator.setEditorInitState}
        onStrudelError={orchestrator.onEditorStrudelError}
        onCodeEvaluated={orchestrator.onEditorCodeEvaluated}
        onSelectSection={orchestrator.onSelectSection}
        onShuffleRhythm={orchestrator.onShuffleRhythm}
        onAddVariation={orchestrator.onAddVariation}
        onRandomReverb={orchestrator.onRandomReverb}
        onJuxRev={orchestrator.onJuxRev}
      />
    ),
    showVisualization,
    vizPanel: showVisualization ? (
      <Suspense fallback={null}>
        <HalVisualization
          isPlaying={isPlaying}
          isListening={false}
          audioAnalyser={orchestrator.audioAnalyser}
        />
      </Suspense>
    ) : null,
    dawPanel: (
      <DawPanel
        project={currentProject}
        sections={sections}
        params={params}
        isEditorInitialized={orchestrator.isEditorInitialized}
        isEditorInitializing={orchestrator.isEditorInitializing}
        cycleInfo={orchestrator.cycleInfo}
        shareUrl={orchestrator.shareUrl}
        shareError={orchestrator.shareError}
        isSharing={orchestrator.isSharing}
        pendingPatchCount={pendingPatchCount}
        onBpmChange={orchestrator.onBpmChange}
        onKeyChange={orchestrator.onProjectKeyChange}
        onTrackGainChange={orchestrator.onTrackGainChange}
        onTrackGainCommit={orchestrator.onTrackGainCommit}
        onTrackPanChange={orchestrator.onTrackPanChange}
        onTrackPanCommit={orchestrator.onTrackPanCommit}
        onInjectCode={orchestrator.onInjectCode}
        onApplyCode={orchestrator.onApplyGeneratedCode}
        versionPanel={versionPanelProps}
      />
    ),
    transportBar: (
      <TransportBar
        isPlaying={isPlaying}
        isSaving={orchestrator.isSaving}
        isDirty={orchestrator.isDirty}
        error={orchestrator.strudelError || orchestrator.saveError}
        phase={orchestrator.cycleInfo?.phase ?? 0}
        activeSection={orchestrator.activeSection}
        onPlay={orchestrator.onPlay}
        onStop={orchestrator.onStop}
        onSave={() => void orchestrator.onManualSave()}
        onUndo={orchestrator.onUndo}
        onRedo={orchestrator.onRedo}
      />
    ),
    versionPanel: versionPanelProps,
    overlay: (
      <>
        <ShortcutsOverlay
          open={orchestrator.showShortcuts}
          onOpenChange={orchestrator.setShowShortcuts}
        />
        <TutorialOverlay lesson={tutorial.currentLesson} isOpen={tutorial.state.activeTab === 'learn'} />
      </>
    ),
  } as const

  const Shell = uiMode === 'legacy' ? LegacyDAWShell : DAWShell

  return (
    <>
      <Shell {...shellProps} />

      {uiMode === 'legacy' ? (
        <div className="fixed bottom-4 right-14 z-50 flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-950/80 px-4 py-2 text-sm text-amber-200 shadow-lg backdrop-blur-sm">
          <span className="font-medium">Legacy UI</span>
          <button
            type="button"
            onClick={toggleUiMode}
            className="rounded-full bg-amber-500/20 px-3 py-0.5 text-xs font-semibold text-amber-100 transition-colors hover:bg-amber-500/40"
          >
            Switch to Ussy Mode
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={toggleUiMode}
          className="fixed bottom-4 right-14 z-50 rounded-md px-2 py-1 text-xs text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
        >
          ⟲ Legacy
        </button>
      )}
    </>
  )
}

export default HomePage
