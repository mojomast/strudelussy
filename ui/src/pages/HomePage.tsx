import { useSearchParams } from 'react-router-dom'
import ChatPanel from '@/components/ChatPanel'
import DAWShell from '@/components/DAWShell'
import DawPanel from '@/components/DawPanel'
import EditorPanel from '@/components/EditorPanel'
import HalVisualization from '@/components/HalVisualization'
import ProjectTopbar from '@/components/ProjectTopbar'
import ShortcutsOverlay from '@/components/ShortcutsOverlay'
import TransportBar from '@/components/TransportBar'
import { useChatOrchestrator } from '@/hooks/useChatOrchestrator'

const HomePage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const orchestrator = useChatOrchestrator({ searchParams, setSearchParams })

  if (orchestrator.isLoadingProject || !orchestrator.currentProject) {
    return <main className="flex min-h-screen items-center justify-center bg-[#050505] text-zinc-400">Loading project...</main>
  }

  const { currentProject, sections, params, pendingDiffs, isPlaying } = orchestrator
  const pendingPatchCount = pendingDiffs.size

  return (
    <DAWShell
      topbar={
        <ProjectTopbar
          projectName={orchestrator.currentProject.name}
          bpm={orchestrator.currentProject.bpm}
          musicalKey={orchestrator.currentProject.key}
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
          onProjectNameChange={orchestrator.onProjectNameChange}
          onBpmChange={orchestrator.onBpmChange}
          onKeyChange={orchestrator.onProjectKeyChange}
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
          onNewProject={() => orchestrator.onLoadTemplateProject('empty')}
          onLoadDemo={() => orchestrator.onLoadTemplateProject('demo')}
          onExportTxt={orchestrator.onExportTxt}
          onExportProject={orchestrator.onExportProject}
          onShare={() => void orchestrator.onShare()}
          onToggleShortcuts={() => orchestrator.setShowShortcuts(!orchestrator.showShortcuts)}
        />
      }
      chatPanel={
        <ChatPanel
          messages={orchestrator.chatMessages}
          isSending={orchestrator.isSending}
          onSend={orchestrator.onSend}
          onApplyDiff={(messageId, diff) => void orchestrator.onApplyDiff(messageId, diff)}
          onRejectDiff={(messageId) => orchestrator.onRejectDiff(messageId)}
          onPreviewDiff={orchestrator.onPreviewDiff}
          onStopPreview={(messageId) => orchestrator.onStopPreview(messageId)}
        />
      }
      editorPanel={
        <EditorPanel
          ref={orchestrator.editorContainerRef}
          project={currentProject}
          sections={sections}
          activeSection={orchestrator.activeSection}
          isPlaying={isPlaying}
          isEditorInitialized={orchestrator.isEditorInitialized}
          isEditorInitializing={orchestrator.isEditorInitializing}
          cycleInfo={orchestrator.cycleInfo}
          onEditorReady={orchestrator.registerEditor}
          onCodeChange={orchestrator.onEditorCodeChange}
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
      }
      vizPanel={
        <HalVisualization isPlaying={isPlaying} isListening={false} />
      }
      dawPanel={
        <DawPanel
          project={currentProject}
          sections={sections}
          params={params}
          isEditorInitialized={orchestrator.isEditorInitialized}
          isEditorInitializing={orchestrator.isEditorInitializing}
          cycleInfo={orchestrator.cycleInfo}
          shareUrl={orchestrator.shareUrl}
          pendingPatchCount={pendingPatchCount}
          onTrackGainChange={orchestrator.onTrackGainChange}
          onTrackGainCommit={orchestrator.onTrackGainCommit}
          onTrackPanChange={orchestrator.onTrackPanChange}
          onTrackPanCommit={orchestrator.onTrackPanCommit}
          onInjectCode={orchestrator.onInjectCode}
          onApplyCode={orchestrator.onApplyGeneratedCode}
        />
      }
      transportBar={
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
      }
      versionPanel={{
        versions: currentProject.versions,
        isLoading: orchestrator.isLoadingVersions,
        isRestoring: orchestrator.isRestoringVersion,
        error: orchestrator.versionError,
        onRefresh: () => void orchestrator.loadVersions(currentProject.id),
        onRestore: (version) => void orchestrator.onRestoreVersion(version),
      }}
      overlay={<ShortcutsOverlay open={orchestrator.showShortcuts} onOpenChange={orchestrator.setShowShortcuts} />}
    />
  )
}

export default HomePage
