import { useSearchParams } from 'react-router-dom'
import ChatPanel from '@/components/ChatPanel'
import DAWShell from '@/components/DAWShell'
import EditorPanel from '@/components/EditorPanel'
import ProjectTopbar from '@/components/ProjectTopbar'
import TransportBar from '@/components/TransportBar'
import { useChatOrchestrator } from '@/hooks/useChatOrchestrator'

const HomePage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const orchestrator = useChatOrchestrator({ searchParams, setSearchParams })

  if (orchestrator.isLoadingProject || !orchestrator.currentProject) {
    return <main className="flex min-h-screen items-center justify-center bg-[#050505] text-zinc-400">Loading project...</main>
  }

  return (
    <DAWShell
      topbar={
        <ProjectTopbar
          projectName={orchestrator.currentProject.name}
          bpm={orchestrator.currentProject.bpm}
          musicalKey={orchestrator.currentProject.key}
          selectedModel={orchestrator.selectedModel}
          onProjectNameChange={orchestrator.onProjectNameChange}
          onBpmChange={orchestrator.onBpmChange}
          onKeyChange={orchestrator.onProjectKeyChange}
          onModelChange={orchestrator.onModelChange}
          onNewProject={() => orchestrator.onLoadTemplateProject('empty')}
          onLoadDemo={() => orchestrator.onLoadTemplateProject('demo')}
          onExportTxt={orchestrator.onExportTxt}
          onExportProject={orchestrator.onExportProject}
          onShare={() => void orchestrator.onShare()}
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
          project={orchestrator.currentProject}
          sections={orchestrator.sections}
          activeSection={orchestrator.activeSection}
          params={orchestrator.params}
          isPlaying={orchestrator.isPlaying}
          isEditorInitialized={orchestrator.isEditorInitialized}
          isEditorInitializing={orchestrator.isEditorInitializing}
          cycleInfo={orchestrator.cycleInfo}
          shareUrl={orchestrator.shareUrl}
          pendingPatchCount={orchestrator.pendingDiffs.size}
          onEditorReady={orchestrator.registerEditor}
          onCodeChange={orchestrator.onEditorCodeChange}
          onPlayStateChange={orchestrator.onEditorPlayStateChange}
          onInitStateChange={orchestrator.setEditorInitState}
          onStrudelError={orchestrator.onEditorStrudelError}
          onCodeEvaluated={orchestrator.onEditorCodeEvaluated}
          onSelectSection={orchestrator.onSelectSection}
          onParamChange={orchestrator.onParamChange}
          onParamCommit={orchestrator.onParamCommit}
        />
      }
      transportBar={
        <TransportBar
          isPlaying={orchestrator.isPlaying}
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
        versions: orchestrator.currentProject.versions,
        isLoading: orchestrator.isLoadingVersions,
        isRestoring: orchestrator.isRestoringVersion,
        error: orchestrator.versionError,
        onRefresh: () => void orchestrator.loadVersions(orchestrator.currentProject!.id),
        onRestore: (version) => void orchestrator.onRestoreVersion(version),
      }}
    />
  )
}

export default HomePage
