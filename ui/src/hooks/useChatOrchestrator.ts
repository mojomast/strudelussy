import { useCallback, useEffect, useRef, useState } from 'react'
import { useProjectStore, trimChatHistoryForApi } from '@/stores/projectStore'
import { api } from '@/lib/api'
import { buildCodeDiff } from '@/lib/diffUtils'
import { getLastProjectId, getOrCreateGuestUserId, loadLocalProject, saveLocalProject } from '@/lib/projectStorage'
import {
  addJuxRevToRandomMelodicTrack,
  addRandomReverbToTracks,
  addVariationToRandomTrack,
  mutateDrumTracks,
  parseBpmFromCode,
  parseKeyFromCode,
  parseTracks,
  updateDetectedParamInCode,
  upsertSetcpsFromBpm,
} from '@/lib/codeParser'
import type { TrackGain } from '@/lib/codeParser'
import { createId } from '@/lib/utils'
import type { ChatMessage, ChatModel, CodeDiff, CodeVersion, ExtractedParam, Project, SectionMarker } from '@/types/project'
import type { CycleInfo } from '@/components/StrudelEditor'
import type { EditorBridge } from '@/components/EditorPanel'

const DEFAULT_CODE = `setcps(0.5)

// [intro]
$: note("<c2 eb2 g2 bb2>")
  .s("sawtooth")
  .slow(2)
  .room(0.2)
  .gain(0.75)
  .color("purple")

// [drums]
$: s("bd [~ hh] sd hh")
  .gain(0.9)
  .room(0.1)
  .color("cyan")

// [lead]
$: note("<c4 eb4 g4 bb4>")
  .s("gm_epiano1")
  .slow(2)
  .gain(0.65)
  .color("orange")`

const EMPTY_CODE = `setcps(0.5)

// [idea]
$: s("bd ~ sd ~")
  .gain(0.8)`

const downloadFile = (filename: string, content: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

const createProjectTemplate = (userId: string, template: 'empty' | 'demo' = 'demo'): Project => {
  const strudelCode = template === 'demo' ? DEFAULT_CODE : EMPTY_CODE
  const now = new Date().toISOString()
  return {
    id: createId(),
    user_id: userId,
    name: template === 'demo' ? 'Demo Strudelussy Session' : 'Untitled Project',
    strudel_code: strudelCode,
    chat_history: [
      {
        id: createId(),
        role: 'system',
        content:
          template === 'demo'
            ? 'Demo project loaded. Ask the AI to evolve the groove, add sections, or fix code before it reaches the editor.'
            : 'Blank project initialized. Start from scratch or ask the AI to scaffold a groove.',
        timestamp: now,
      },
    ],
    versions: [],
    bpm: parseBpmFromCode(strudelCode),
    key: parseKeyFromCode(strudelCode),
    tags: template === 'demo' ? ['guest', 'demo'] : ['guest', 'empty'],
    created_at: now,
    updated_at: now,
  }
}

interface UseChatOrchestratorArgs {
  searchParams: URLSearchParams
  setSearchParams: (nextInit: URLSearchParams | Record<string, string>) => void
}

export const useChatOrchestrator = ({ searchParams, setSearchParams }: UseChatOrchestratorArgs) => {
  const [isSending, setIsSending] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [cycleInfo, setCycleInfo] = useState<CycleInfo | null>(null)
  const [isEditorInitialized, setIsEditorInitialized] = useState(false)
  const [isEditorInitializing, setIsEditorInitializing] = useState(false)
  const [isLoadingProject, setIsLoadingProject] = useState(true)
  const [isLoadingVersions, setIsLoadingVersions] = useState(false)
  const [isRestoringVersion, setIsRestoringVersion] = useState(false)
  const [versionError, setVersionError] = useState<string | null>(null)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [isRhythmGeneratorCollapsed, setIsRhythmGeneratorCollapsed] = useState(true)
  const [isArrangePanelCollapsed, setIsArrangePanelCollapsed] = useState(true)
  const [isFxRackCollapsed, setIsFxRackCollapsed] = useState(true)
  const pendingSendContentsRef = useRef(new Set<string>())

  const editorBridgeRef = useRef<Partial<EditorBridge>>({})
  const autoSaveTimerRef = useRef<number | null>(null)
  const paramEvaluateTimerRef = useRef<number | null>(null)
  const previewSnapshotRef = useRef<string | null>(null)
  const previewMessageIdRef = useRef<string | null>(null)
  const editorContainerRef = useRef<HTMLDivElement | null>(null)

  const {
    currentProject,
    chatMessages,
    pendingDiffs,
    sections,
    activeSection,
    isDirty,
    isSaving,
    saveError,
    isPlaying,
    strudelError,
    params,
    selectedModel,
    actions,
  } = useProjectStore()

  const userId = getOrCreateGuestUserId()

  const registerEditor = useCallback((bridge: Partial<EditorBridge>) => {
    editorBridgeRef.current = { ...editorBridgeRef.current, ...bridge }
  }, [])

  const getCurrentCode = useCallback(() => editorBridgeRef.current.getCode?.() ?? currentProject?.strudel_code ?? '', [currentProject?.strudel_code])

  const loadVersions = useCallback(async (projectId: string) => {
    setIsLoadingVersions(true)
    setVersionError(null)
    try {
      const versions = await api.getVersions(projectId, userId)
      actions.replaceVersions(versions)
    } catch (error) {
      if (error instanceof Error && error.message.includes('Project not found')) {
        actions.replaceVersions([])
      } else {
        setVersionError(error instanceof Error ? error.message : 'Failed to load version history.')
      }
    } finally {
      setIsLoadingVersions(false)
    }
  }, [actions, userId])

  const persistProject = useCallback(async (project: Project): Promise<Project> => {
    actions.setSaving(true)
    actions.setSaveError(null)

    const payload: Project = {
      ...project,
      chat_history: useProjectStore.getState().chatMessages,
      versions: useProjectStore.getState().currentProject?.versions ?? project.versions,
      updated_at: new Date().toISOString(),
    }

    saveLocalProject(payload)

    try {
      const existsRemotely = project.id === searchParams.get('project')
      const savedProject = existsRemotely
        ? await api.updateProject(payload, userId)
        : await api.createProject(payload, userId)
      saveLocalProject(savedProject)
      actions.setProject(savedProject)
      actions.markSaved(savedProject.updated_at)
      setSearchParams({ project: savedProject.id })
      return savedProject
    } catch (error) {
      actions.setSaveError(error instanceof Error ? error.message : 'Unable to save project to API. Local guest copy kept.')
      actions.markSaved(payload.updated_at)
      return payload
    }
  }, [actions, searchParams, setSearchParams, userId])

  const createSnapshot = useCallback(async (
    projectId: string,
    code: string,
    label: string,
    createdBy: 'user' | 'ai',
  ) => {
    const versions = await api.createVersion(projectId, { code, label, created_by: createdBy }, userId)
    actions.replaceVersions(versions)
    return versions
  }, [actions, userId])

  const saveVersionSnapshot = useCallback(async (
    project: Project,
    code: string,
    label: string,
    createdBy: 'user' | 'ai',
  ) => {
    const persistedProject = await persistProject({
      ...project,
      strudel_code: code,
      bpm: parseBpmFromCode(code),
      key: parseKeyFromCode(code),
    })

    try {
      await createSnapshot(persistedProject.id, code, label, createdBy)
      await loadVersions(persistedProject.id)
    } catch (error) {
      setVersionError(error instanceof Error ? error.message : 'Failed to save snapshot.')
    }

    return persistedProject
  }, [createSnapshot, loadVersions, persistProject])

  const loadProject = useCallback(async (projectId?: string | null) => {
    setIsLoadingProject(true)

    const requestedTemplate = searchParams.get('template')
    if (requestedTemplate === 'empty' || requestedTemplate === 'demo') {
      const project = createProjectTemplate(userId, requestedTemplate)
      actions.setProject(project)
      saveLocalProject(project)
      setSearchParams({ project: project.id })
      setIsLoadingProject(false)
      return
    }

    const nextProjectId = projectId || searchParams.get('project') || getLastProjectId()

    if (!nextProjectId) {
      const project = createProjectTemplate(userId, 'demo')
      actions.setProject(project)
      saveLocalProject(project)
      setSearchParams({ project: project.id })
      setIsLoadingProject(false)
      return
    }

    const localProject = loadLocalProject(nextProjectId)
    if (localProject) {
      actions.setProject(localProject)
      setSearchParams({ project: localProject.id })
      setIsLoadingProject(false)
      return
    }

    try {
      const remoteProject = await api.getProject(nextProjectId, userId)
      actions.setProject(remoteProject)
      saveLocalProject(remoteProject)
      setSearchParams({ project: remoteProject.id })
      await loadVersions(remoteProject.id)
    } catch {
      const fallbackProject = createProjectTemplate(userId, 'demo')
      actions.setProject(fallbackProject)
      saveLocalProject(fallbackProject)
      setSearchParams({ project: fallbackProject.id })
    } finally {
      setIsLoadingProject(false)
    }
  }, [actions, loadVersions, searchParams, setSearchParams, userId])

  useEffect(() => {
    const shareId = searchParams.get('share')
    if (shareId) {
      api.loadSharedCode(shareId).then((data) => {
        const project = createProjectTemplate(userId, 'demo')
        project.id = createId()
        project.name = 'Shared Session Copy'
        project.strudel_code = data.code
        project.bpm = parseBpmFromCode(data.code)
        project.key = parseKeyFromCode(data.code)
        actions.setProject(project)
        saveLocalProject(project)
        setSearchParams({ project: project.id })
        setIsLoadingProject(false)
      }).catch(() => {
        void loadProject(null)
      })
      return
    }

    void loadProject(null)
  }, [actions, loadProject, searchParams, setSearchParams, userId])

  useEffect(() => {
    if (!currentProject || !isDirty) return

    if (autoSaveTimerRef.current) {
      window.clearTimeout(autoSaveTimerRef.current)
    }

    autoSaveTimerRef.current = window.setTimeout(() => {
      void persistProject({ ...currentProject, chat_history: useProjectStore.getState().chatMessages })
    }, 3000)

    return () => {
      if (autoSaveTimerRef.current) {
        window.clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [currentProject, isDirty, persistProject])

  const stopPreview = useCallback((messageId?: string) => {
    const currentMessageId = messageId ?? previewMessageIdRef.current
    if (!currentMessageId) return

    const snapshot = previewSnapshotRef.current
    if (snapshot !== null) {
      editorBridgeRef.current.setCode?.(snapshot)
      actions.setCode(snapshot)
    }

    editorBridgeRef.current.stop?.()
    actions.setDiffPreviewing(currentMessageId, false)
    previewSnapshotRef.current = null
    previewMessageIdRef.current = null
  }, [actions])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const modifierKey = navigator.platform.includes('Mac') ? event.metaKey : event.ctrlKey

      if (event.code === 'Space') {
        const activeElement = document.activeElement
        const isTextInput = activeElement?.tagName === 'TEXTAREA' || activeElement?.tagName === 'INPUT'
        if (!isTextInput) {
          event.preventDefault()
          if (isPlaying) {
            editorBridgeRef.current.stop?.()
          } else {
            editorBridgeRef.current.play?.()
          }
        }
      }

      if (event.key === '?' && !(document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'INPUT')) {
        event.preventDefault()
        setShowShortcuts((current) => !current)
      }

      if (event.key === 'Escape') {
        if (previewMessageIdRef.current) {
          event.preventDefault()
          stopPreview(previewMessageIdRef.current)
          return
        }

        if (showShortcuts) {
          event.preventDefault()
          setShowShortcuts(false)
        }
      }

      if (modifierKey && event.key.toLowerCase() === 's') {
        event.preventDefault()
        if (!currentProject) return
        void saveVersionSnapshot(currentProject, getCurrentCode(), 'Manual save', 'user')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentProject, getCurrentCode, isPlaying, saveVersionSnapshot, showShortcuts, stopPreview])

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCycleInfo(editorBridgeRef.current.getCycleInfo?.() ?? null)
    }, 100)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => () => {
    if (paramEvaluateTimerRef.current) {
      window.clearTimeout(paramEvaluateTimerRef.current)
    }
  }, [])

  const onSend = useCallback(async (content: string) => {
    if (!currentProject) return
    const trimmedContent = content.trim()
    if (!trimmedContent || pendingSendContentsRef.current.has(trimmedContent)) return

    pendingSendContentsRef.current.add(trimmedContent)
    setIsSending(true)
    const userMessage: ChatMessage = {
      id: createId(),
      role: 'user',
      content: trimmedContent,
      timestamp: new Date().toISOString(),
    }

    const streamingAssistantId = createId()
    const nextMessages = [...useProjectStore.getState().chatMessages, userMessage, {
      id: streamingAssistantId,
      role: 'assistant' as const,
      content: '',
      timestamp: new Date().toISOString(),
    }]

    actions.setChatMessages(nextMessages)

    try {
      const currentCode = getCurrentCode()
      await api.chatStream({
        project_id: currentProject.id,
        messages: trimChatHistoryForApi([...useProjectStore.getState().chatMessages.filter((message) => message.id !== streamingAssistantId)]),
        current_code: currentCode,
        model: selectedModel,
        project_meta: {
          bpm: currentProject.bpm,
          key: currentProject.key,
          tags: currentProject.tags,
        },
      }, userId, {
        onChunk: (chunk) => {
          const messages = useProjectStore.getState().chatMessages.map((message) =>
            message.id === streamingAssistantId ? { ...message, content: `${message.content}${chunk}` } : message,
          )
          actions.setChatMessages(messages)
        },
        onDone: (finalResponse) => {
          const assistantMessage: ChatMessage = {
            id: streamingAssistantId,
            role: 'assistant',
            content: finalResponse.message,
            timestamp: new Date().toISOString(),
          }

          if (finalResponse.has_code_change && finalResponse.code) {
            const diff = buildCodeDiff(currentCode, finalResponse.code, finalResponse.diff_summary || 'Updated the Strudel arrangement')
            assistantMessage.code_diff = diff
            assistantMessage.status = 'pending'
          }

          const finalizedMessages = useProjectStore.getState().chatMessages.map((message) =>
            message.id === streamingAssistantId ? assistantMessage : message,
          )
          actions.setChatMessages(finalizedMessages)

          if (assistantMessage.code_diff) {
            actions.setPendingDiff(assistantMessage.id, assistantMessage.code_diff)
          }
        },
      })
    } catch (error) {
      const messages = useProjectStore.getState().chatMessages.map((message) =>
        message.id === streamingAssistantId
          ? {
              ...message,
              content: error instanceof Error ? error.message : 'Chat request failed.',
            }
          : message,
      )
      actions.setChatMessages(messages)
    } finally {
      pendingSendContentsRef.current.delete(trimmedContent)
      setIsSending(pendingSendContentsRef.current.size > 0)
    }
  }, [actions, currentProject, getCurrentCode, selectedModel, userId])

  const onPreviewDiff = useCallback((messageId: string, diff: CodeDiff) => {
    previewSnapshotRef.current = getCurrentCode()
    previewMessageIdRef.current = messageId
    editorBridgeRef.current.setCode?.(diff.after)
    actions.setCode(diff.after)
    if (!isPlaying) {
      editorBridgeRef.current.play?.()
    } else {
      window.setTimeout(() => editorBridgeRef.current.evaluate?.(), 60)
    }
    actions.setDiffPreviewing(messageId, true)
  }, [actions, getCurrentCode, isPlaying])

  const onApplyDiff = useCallback(async (messageId: string, diff: CodeDiff) => {
    if (!currentProject) return

    previewSnapshotRef.current = null
    previewMessageIdRef.current = null
    editorBridgeRef.current.setCode?.(diff.after)
    actions.setCode(diff.after)

    if (isPlaying) {
      window.setTimeout(() => editorBridgeRef.current.evaluate?.(), 60)
    }

    actions.applyDiff(messageId)
    await saveVersionSnapshot(currentProject, diff.after, 'Applied AI patch', 'ai')
  }, [actions, currentProject, isPlaying, saveVersionSnapshot])

  const onRejectDiff = useCallback((messageId: string) => {
    if (previewMessageIdRef.current === messageId) {
      stopPreview(messageId)
    }
    actions.rejectDiff(messageId)
  }, [actions, stopPreview])

  const onParamChange = useCallback((param: ExtractedParam, nextValue: number) => {
    const sourceCode = getCurrentCode()
    const nextCode = updateDetectedParamInCode(sourceCode, param, nextValue)
    editorBridgeRef.current.setCode?.(nextCode)
    actions.setCode(nextCode)

    if (isPlaying) {
      if (paramEvaluateTimerRef.current) {
        window.clearTimeout(paramEvaluateTimerRef.current)
      }

      paramEvaluateTimerRef.current = window.setTimeout(() => {
        editorBridgeRef.current.evaluate?.()
      }, 120)
    }
  }, [actions, getCurrentCode, isPlaying])

  const onParamCommit = useCallback((param: ExtractedParam, nextValue: number) => {
    if (!currentProject) return
    const nextCode = updateDetectedParamInCode(getCurrentCode(), param, nextValue)
    const latestVersionCode = currentProject.versions[0]?.code
    if (latestVersionCode === nextCode) {
      return
    }
    actions.upsertVersion(nextCode, 'param edit', 'user')
    void saveVersionSnapshot(currentProject, nextCode, 'param edit', 'user')
  }, [actions, currentProject, getCurrentCode, saveVersionSnapshot])

  const onTrackGainChange = useCallback((trackGain: TrackGain, value: number) => {
    const code = getCurrentCode()
    let nextCode: string
    if (trackGain.hasGain && trackGain.gainStart >= 0) {
      nextCode = `${code.slice(0, trackGain.gainStart)}${value.toFixed(2)}${code.slice(trackGain.gainEnd)}`
    } else {
      const tracks = parseTracks(code)
      const track = tracks.find(t => t.id === trackGain.trackId)
      if (!track) return
      const updated = `${track.source.trimEnd()}\n  .gain(${value.toFixed(2)})\n`
      nextCode = `${code.slice(0, track.start)}${updated}${code.slice(track.end)}`
    }
    editorBridgeRef.current.setCode?.(nextCode)
    actions.setCode(nextCode)
    if (isPlaying) {
      if (paramEvaluateTimerRef.current) window.clearTimeout(paramEvaluateTimerRef.current)
      paramEvaluateTimerRef.current = window.setTimeout(() => editorBridgeRef.current.evaluate?.(), 120)
    }
  }, [actions, getCurrentCode, isPlaying])

  const onTrackGainCommit = useCallback((trackGain: TrackGain, value: number) => {
    if (!currentProject) return
    const code = getCurrentCode()
    let nextCode: string
    if (trackGain.hasGain && trackGain.gainStart >= 0) {
      nextCode = `${code.slice(0, trackGain.gainStart)}${value.toFixed(2)}${code.slice(trackGain.gainEnd)}`
    } else {
      const tracks = parseTracks(code)
      const track = tracks.find(t => t.id === trackGain.trackId)
      if (!track) return
      const updated = `${track.source.trimEnd()}\n  .gain(${value.toFixed(2)})\n`
      nextCode = `${code.slice(0, track.start)}${updated}${code.slice(track.end)}`
    }
    void saveVersionSnapshot(currentProject, nextCode, 'track gain edit', 'user')
  }, [currentProject, getCurrentCode, saveVersionSnapshot])

  const onRestoreVersion = useCallback(async (version: CodeVersion) => {
    if (!currentProject) return

    setIsRestoringVersion(true)
    setVersionError(null)

    try {
      for (const messageId of useProjectStore.getState().pendingDiffs.keys()) {
        actions.rejectDiff(messageId)
      }
      if (previewMessageIdRef.current) {
        stopPreview(previewMessageIdRef.current)
      }

      const currentCode = getCurrentCode()
      await saveVersionSnapshot(currentProject, currentCode, 'Before restore', 'user')

      editorBridgeRef.current.setCode?.(version.code)
      actions.setCode(version.code)

      await persistProject({
        ...currentProject,
        strudel_code: version.code,
        bpm: parseBpmFromCode(version.code),
        key: parseKeyFromCode(version.code),
      })

      await loadVersions(currentProject.id)
    } catch (error) {
      setVersionError(error instanceof Error ? error.message : 'Failed to restore version.')
    } finally {
      setIsRestoringVersion(false)
    }
  }, [actions, currentProject, getCurrentCode, loadVersions, persistProject, saveVersionSnapshot, stopPreview])

  const onSelectSection = useCallback((section: SectionMarker) => {
    actions.setActiveSection(section.label)
    editorBridgeRef.current.jumpToLine?.(section.line)
    if (window.matchMedia('(max-width: 1024px)').matches) {
      editorContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [actions])

  const onPlay = useCallback(() => editorBridgeRef.current.play?.(), [])
  const onStop = useCallback(() => editorBridgeRef.current.stop?.(), [])
  const onUndo = useCallback(() => editorBridgeRef.current.undo?.(), [])
  const onRedo = useCallback(() => editorBridgeRef.current.redo?.(), [])

  const onManualSave = useCallback(async () => {
    if (!currentProject) return
    await saveVersionSnapshot(currentProject, getCurrentCode(), 'Manual save', 'user')
  }, [currentProject, getCurrentCode, saveVersionSnapshot])

  const onLoadTemplateProject = useCallback((template: 'empty' | 'demo') => {
    if (isPlaying) {
      editorBridgeRef.current.stop?.()
    }

    for (const messageId of useProjectStore.getState().pendingDiffs.keys()) {
      actions.rejectDiff(messageId)
    }

    const project = createProjectTemplate(userId, template)
    editorBridgeRef.current.setCode?.(project.strudel_code)
    actions.setProject(project)
    saveLocalProject(project)
    setSearchParams({ project: project.id })
    setShareUrl(null)
    setVersionError(null)
  }, [actions, isPlaying, setSearchParams, userId])

  const onShare = useCallback(async () => {
    if (!currentProject) return
    try {
      const response = await api.shareCode(getCurrentCode())
      setShareUrl(response.url)
    } catch {
      setShareUrl('Share failed')
    }
  }, [currentProject, getCurrentCode])

  const onExportTxt = useCallback(() => {
    if (!currentProject) return
    downloadFile(`${currentProject.name}.txt`, getCurrentCode(), 'text/plain')
  }, [currentProject, getCurrentCode])

  const onExportProject = useCallback(() => {
    if (!currentProject) return
    downloadFile(`${currentProject.name}.strudel`, JSON.stringify({ ...currentProject, strudel_code: getCurrentCode() }, null, 2), 'application/json')
  }, [currentProject, getCurrentCode])

  const onBpmChange = useCallback((bpm: number) => {
    const nextCode = upsertSetcpsFromBpm(getCurrentCode(), bpm)
    editorBridgeRef.current.setCode?.(nextCode)
    actions.setCode(nextCode)
  }, [actions, getCurrentCode])

  const syncEditorCode = useCallback((code: string, evaluate = false) => {
    editorBridgeRef.current.setCode?.(code)
    actions.setCode(code)
    if (evaluate && isPlaying) {
      window.setTimeout(() => editorBridgeRef.current.evaluate?.(), 60)
    }
  }, [actions, isPlaying])

  const onInjectCode = useCallback((snippet: string) => {
    const currentCode = getCurrentCode().trimEnd()
    const nextCode = `${currentCode}\n\n${snippet.trim()}\n`
    syncEditorCode(nextCode, true)
  }, [getCurrentCode, syncEditorCode])

  const onApplyGeneratedCode = useCallback((code: string) => {
    syncEditorCode(code, true)
  }, [syncEditorCode])

  const onShuffleRhythm = useCallback(() => {
    syncEditorCode(mutateDrumTracks(getCurrentCode()), true)
  }, [getCurrentCode, syncEditorCode])

  const onAddVariation = useCallback(() => {
    syncEditorCode(addVariationToRandomTrack(getCurrentCode()), true)
  }, [getCurrentCode, syncEditorCode])

  const onRandomReverb = useCallback(() => {
    syncEditorCode(addRandomReverbToTracks(getCurrentCode()), true)
  }, [getCurrentCode, syncEditorCode])

  const onJuxRev = useCallback(() => {
    syncEditorCode(addJuxRevToRandomMelodicTrack(getCurrentCode()), true)
  }, [getCurrentCode, syncEditorCode])

  const onProjectNameChange = useCallback((name: string) => actions.setProjectName(name), [actions])
  const onProjectKeyChange = useCallback((key: string) => actions.setProjectKey(key), [actions])
  const onModelChange = useCallback((model: ChatModel) => actions.setSelectedModel(model), [actions])
  const onEditorCodeChange = useCallback((code: string) => actions.setCode(code), [actions])
  const onEditorPlayStateChange = useCallback((playing: boolean) => actions.setPlaying(playing), [actions])
  const onEditorStrudelError = useCallback((error: string | null) => actions.setStrudelError(error), [actions])
  const onEditorCodeEvaluated = useCallback(() => actions.setStrudelError(null), [actions])

  return {
    currentProject,
    chatMessages,
    pendingDiffs,
    sections,
    activeSection,
    params,
    selectedModel,
    isDirty,
    isSaving,
    saveError,
    isPlaying,
    strudelError,
    shareUrl,
    cycleInfo,
    isEditorInitialized,
    isEditorInitializing,
    isLoadingProject,
    isLoadingVersions,
    isRestoringVersion,
    versionError,
    showShortcuts,
    isRhythmGeneratorCollapsed,
    isArrangePanelCollapsed,
    isFxRackCollapsed,
    isSending,
    editorContainerRef,
    registerEditor,
    onSend,
    onApplyDiff,
    onRejectDiff,
    onPreviewDiff,
    onStopPreview: stopPreview,
    onParamChange,
    onParamCommit,
    onTrackGainChange,
    onTrackGainCommit,
    onRestoreVersion,
    onLoadTemplateProject,
    onShare,
    onExportTxt,
    onExportProject,
    onPlay,
    onStop,
    onUndo,
    onRedo,
    onManualSave,
    onSelectSection,
    onBpmChange,
    onInjectCode,
    onApplyGeneratedCode,
    onShuffleRhythm,
    onAddVariation,
    onRandomReverb,
    onJuxRev,
    onProjectNameChange,
    onProjectKeyChange,
    onModelChange,
    onEditorCodeChange,
    loadVersions,
    onEditorPlayStateChange,
    onEditorStrudelError,
    onEditorCodeEvaluated,
    setShowShortcuts,
    toggleRhythmGenerator: () => setIsRhythmGeneratorCollapsed((current) => !current),
    toggleArrangePanel: () => setIsArrangePanelCollapsed((current) => !current),
    toggleFxRack: () => setIsFxRackCollapsed((current) => !current),
    setEditorInitState: (initialized: boolean, initializing: boolean) => {
      setIsEditorInitialized(initialized)
      setIsEditorInitializing(initializing)
    },
  }
}

export type UseChatOrchestratorResult = ReturnType<typeof useChatOrchestrator>
