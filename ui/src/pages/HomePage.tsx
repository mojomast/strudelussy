/**
 * HomePage – root page for the Strudelussy DAW.
 *
 * // What changed:
 * // - Wired the tutorial feature at the page level via useTutorial()
 * // - Passed tutorial props into ChatPanel and rendered TutorialOverlay at the shell root
 * // - Added Cmd/Ctrl+Shift+T handling to toggle the Learn tab
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import ChatPanel from '@/components/ChatPanel'
import DAWShell from '@/components/DAWShell'
import DawPanel from '@/components/DawPanel'
import EditorPanel from '@/components/EditorPanel'
import LegacyDAWShell from '@/components/LegacyDAWShell'
import ProjectTopbar from '@/components/ProjectTopbar'
import ShortcutsOverlay from '@/components/ShortcutsOverlay'
import TransportBar from '@/components/TransportBar'
import VisualizationSurface from '@/components/visualization/VisualizationSurface'
import type { DmxVisualizationData, VisualizationMode } from '@/components/visualization/types'
import { TutorialOverlay, useTutorial } from '@/features/tutorial'
import { useChatOrchestrator } from '@/hooks/useChatOrchestrator'
import type { LightingProjectState } from '@/types/project'

type UIMode = 'ussy' | 'legacy'

const EMPTY_LIGHTING: LightingProjectState = {
  cue_bindings: [],
  group_bindings: [],
}

const HomePage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [showVisualization, setShowVisualization] = useState(true)
  const [uiMode, setUiMode] = useState<UIMode>('ussy')
  const [visualizationMode, setVisualizationMode] = useState<VisualizationMode>('hal')
  const [dmxVisualizationData, setDmxVisualizationData] = useState<DmxVisualizationData | null>(null)
  const [activeLightingScene, setActiveLightingScene] = useState<string | null>(null)
  const [activeLightingGroup, setActiveLightingGroup] = useState<string | null>(null)
  const [automationStatus, setAutomationStatus] = useState<Array<{ group_id: string; track_name: string; intensity: number; remaining_ms: number }>>([])
  const lastTriggeredSceneRef = useRef<string | null>(null)
  const lastTriggeredGroupRef = useRef<string | null>(null)
  const groupPulseTimersRef = useRef<Map<string, number>>(new Map())
  const lastGroupPulseKeyRef = useRef<string | null>(null)
  const groupPulseMetaRef = useRef<Map<string, { track_name: string; intensity: number; ends_at: number }>>(new Map())
  const dmxBridgeUrl = (import.meta.env.VITE_DMX_BRIDGE_URL as string | undefined) ?? 'http://127.0.0.1:3334'

  const orchestrator = useChatOrchestrator({ searchParams, setSearchParams })
  const tutorial = useTutorial()
  const currentProject = orchestrator.currentProject
  const isLoadingProject = orchestrator.isLoadingProject
  const isPlaying = orchestrator.isPlaying
  const lighting = currentProject?.lighting ?? EMPTY_LIGHTING

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

  const refreshDmxVisualization = useCallback(async () => {
    try {
      const response = await fetch(`${dmxBridgeUrl}/state`)
      if (!response.ok) {
        throw new Error(`Bridge state request failed: ${response.status}`)
      }
      const payload = await response.json() as DmxVisualizationData
      setDmxVisualizationData(payload)
    } catch {
      setDmxVisualizationData(null)
    }
  }, [dmxBridgeUrl])

  useEffect(() => {
    if (!showVisualization && visualizationMode !== 'dmx') {
      return
    }

    let cancelled = false
    const poll = async () => {
      await refreshDmxVisualization()
      if (cancelled) {
        return
      }
    }

    void poll()
    const interval = window.setInterval(() => {
      void poll()
    }, 1000)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [refreshDmxVisualization, showVisualization, visualizationMode])

  useEffect(() => {
    const interval = window.setInterval(() => {
      const now = Date.now()
      const next = [...groupPulseMetaRef.current.entries()]
        .map(([group_id, meta]) => ({
          group_id,
          track_name: meta.track_name,
          intensity: meta.intensity,
          remaining_ms: Math.max(0, Math.round(meta.ends_at - now)),
        }))
        .filter((entry) => entry.remaining_ms > 0)
      setAutomationStatus(next)
    }, 50)

    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    if (isPlaying) {
      return
    }

    lastTriggeredSceneRef.current = null
    lastTriggeredGroupRef.current = null
    for (const timer of groupPulseTimersRef.current.values()) {
      window.clearTimeout(timer)
    }
    groupPulseTimersRef.current.clear()
    groupPulseMetaRef.current.clear()
    lastGroupPulseKeyRef.current = null
    setAutomationStatus([])
    setActiveLightingScene(null)
    setActiveLightingGroup(null)
  }, [isPlaying])

  useEffect(() => {
    if (!isPlaying) {
      return
    }

    const activeSection = orchestrator.activeSection
    if (!activeSection) {
      setActiveLightingScene(null)
      return
    }

    const cueBinding = lighting.cue_bindings.find((binding) => binding.section_label === activeSection)
    if (!cueBinding) {
      setActiveLightingScene(null)
      return
    }

    setActiveLightingScene(cueBinding.scene_id)
    if (lastTriggeredSceneRef.current === cueBinding.scene_id) {
      return
    }

    lastTriggeredSceneRef.current = cueBinding.scene_id
    void fetch(`${dmxBridgeUrl}/scenes/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scene_id: cueBinding.scene_id }),
    }).then(() => refreshDmxVisualization()).catch(() => undefined)
  }, [dmxBridgeUrl, isPlaying, lighting.cue_bindings, orchestrator.activeSection, refreshDmxVisualization])

  useEffect(() => {
    if (!isPlaying) {
      return
    }

    const activity = orchestrator.getTrackActivity()
    const activeTrackName = activity.activeTracks.find((trackName) =>
      lighting.group_bindings.some((binding) => binding.track_name === trackName),
    )

    if (!activeTrackName) {
      setActiveLightingGroup(null)
      return
    }

    const binding = lighting.group_bindings.find((candidate) => candidate.track_name === activeTrackName)
    if (!binding) {
      setActiveLightingGroup(null)
      return
    }

    setActiveLightingGroup(binding.group_id)
    const intensity = Math.max(0, Math.min(255, binding.intensity ?? 180))
    const holdMs = Math.max(50, Math.min(2000, binding.hold_ms ?? 150))
    const fadeMs = Math.max(0, Math.min(1000, binding.fade_ms ?? 30))
    const pulseKey = `${binding.track_name}:${binding.group_id}:${activity.cycleStart}`
    if (lastGroupPulseKeyRef.current === pulseKey) {
      return
    }

    lastGroupPulseKeyRef.current = pulseKey
    lastTriggeredGroupRef.current = binding.group_id
    const pulseStart = Date.now()
    const pulseEnd = pulseStart + holdMs
    groupPulseMetaRef.current.set(binding.group_id, {
      track_name: binding.track_name,
      intensity,
      ends_at: pulseEnd,
    })
    void fetch(`${dmxBridgeUrl}/control/group`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_id: binding.group_id, intensity }),
    }).then(() => refreshDmxVisualization()).catch(() => undefined)

    const existingTimer = groupPulseTimersRef.current.get(binding.group_id)
    if (existingTimer) {
      window.clearTimeout(existingTimer)
    }

    const releaseTimer = window.setTimeout(() => {
      const fadeSteps = fadeMs > 0 ? Math.max(1, Math.round(fadeMs / 50)) : 1
      for (let step = 1; step <= fadeSteps; step += 1) {
        window.setTimeout(() => {
          const nextIntensity = Math.max(0, Math.round(intensity * (1 - step / fadeSteps)))
          void fetch(`${dmxBridgeUrl}/control/group`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ group_id: binding.group_id, intensity: nextIntensity }),
          }).then(() => refreshDmxVisualization()).catch(() => undefined)
          if (step === fadeSteps) {
            groupPulseMetaRef.current.delete(binding.group_id)
          }
        }, step * Math.max(1, Math.floor(fadeMs / Math.max(1, fadeSteps))))
      }
      groupPulseTimersRef.current.delete(binding.group_id)
    }, holdMs)

    groupPulseTimersRef.current.set(binding.group_id, releaseTimer)
  }, [dmxBridgeUrl, isPlaying, lighting.group_bindings, orchestrator.getTrackActivity, refreshDmxVisualization])

  if (isLoadingProject || !currentProject) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--ussy-bg)] text-[var(--ussy-text-muted)]">
        Loading project...
      </main>
    )
  }

  const { sections, params, pendingDiffs } = orchestrator
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
        projectName={currentProject.name}
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
        visualizationMode={visualizationMode}
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
        onVisualizationModeChange={setVisualizationMode}
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
        activeLightingScene={activeLightingScene}
        activeLightingGroup={activeLightingGroup}
        isPlaying={isPlaying}
        showVisualization={showVisualization}
        audioAnalyser={orchestrator.audioAnalyser}
        visualizationMode={visualizationMode}
        dmxVisualizationData={dmxVisualizationData}
        dmxBridgeUrl={dmxBridgeUrl}
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
      <VisualizationSurface
        mode={visualizationMode}
        isPlaying={isPlaying}
        audioAnalyser={orchestrator.audioAnalyser}
        dmxData={dmxVisualizationData}
        dmxBridgeUrl={dmxBridgeUrl}
      />
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
        dmxVisualizationData={dmxVisualizationData}
        dmxBridgeUrl={dmxBridgeUrl}
        visualizationEnabled={showVisualization}
        visualizationMode={visualizationMode}
        lighting={currentProject.lighting ?? { cue_bindings: [], group_bindings: [] }}
        automationStatus={automationStatus}
        onBpmChange={orchestrator.onBpmChange}
        onKeyChange={orchestrator.onProjectKeyChange}
        onTrackGainChange={orchestrator.onTrackGainChange}
        onTrackGainCommit={orchestrator.onTrackGainCommit}
        onTrackPanChange={orchestrator.onTrackPanChange}
        onTrackPanCommit={orchestrator.onTrackPanCommit}
        onInjectCode={orchestrator.onInjectCode}
        onApplyCode={orchestrator.onApplyGeneratedCode}
        onVisualizationModeChange={setVisualizationMode}
        onLightingChange={orchestrator.onProjectLightingChange}
        onRefreshDmx={() => void refreshDmxVisualization()}
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
        activeLightingScene={activeLightingScene}
        activeLightingGroup={activeLightingGroup}
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
