import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FolderKanban, Sparkles } from 'lucide-react'
import StrudelEditor, { type CycleInfo } from '@/components/StrudelEditor'
import HalVisualization from '@/components/HalVisualization'
import ChatPanel from '@/components/ChatPanel'
import ProjectTopbar from '@/components/ProjectTopbar'
import SectionStrip from '@/components/SectionStrip'
import VisualizationBar from '@/components/VisualizationBar'
import VersionHistoryPanel from '@/components/VersionHistoryPanel'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { api } from '@/lib/api'
import { buildCodeDiff } from '@/lib/diffUtils'
import { parseBpmFromCode, parseKeyFromCode, updateDetectedParamInCode, upsertSetcpsFromBpm } from '@/lib/codeParser'
import { getLastProjectId, getOrCreateGuestUserId, loadLocalProject, saveLocalProject } from '@/lib/projectStorage'
import { useProjectStore } from '@/stores/projectStore'
import type { ChatMessage, CodeVersion, ExtractedParam, Project } from '@/types/project'
import { createId } from '@/lib/utils'

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

const downloadFile = (filename: string, content: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

const HomePage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [isSending, setIsSending] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [cycleInfo, setCycleInfo] = useState<CycleInfo | null>(null)
  const [isEditorInitialized, setIsEditorInitialized] = useState(false)
  const [isEditorInitializing, setIsEditorInitializing] = useState(false)
  const [isLoadingProject, setIsLoadingProject] = useState(true)
  const [isLoadingVersions, setIsLoadingVersions] = useState(false)
  const [isRestoringVersion, setIsRestoringVersion] = useState(false)
  const [versionError, setVersionError] = useState<string | null>(null)

  const editorPlayRef = useRef<(() => void) | null>(null)
  const editorStopRef = useRef<(() => void) | null>(null)
  const editorEvaluateRef = useRef<(() => void) | null>(null)
  const editorSetCodeRef = useRef<((code: string) => void) | null>(null)
  const editorUndoRef = useRef<(() => void) | null>(null)
  const editorRedoRef = useRef<(() => void) | null>(null)
  const getCurrentCodeRef = useRef<(() => string) | null>(null)
  const getCycleInfoRef = useRef<(() => CycleInfo | null) | null>(null)
  const jumpToLineRef = useRef<((line: number) => void) | null>(null)
  const autoSaveTimerRef = useRef<number | null>(null)
  const paramEvaluateTimerRef = useRef<number | null>(null)

  const {
    currentProject,
    chatMessages,
    pendingDiff,
    sections,
    activeSection,
    isDirty,
    isSaving,
    saveError,
    isPlaying,
    strudelError,
    params,
    actions,
  } = useProjectStore()

  const userId = useMemo(() => getOrCreateGuestUserId(), [])

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

  const createSnapshot = useCallback(async (
    projectId: string,
    code: string,
    label: string,
    createdBy: 'user' | 'ai',
  ) => {
    const versions = await api.createVersion(projectId, {
      code,
      label,
      created_by: createdBy,
    }, userId)
    actions.replaceVersions(versions)
    return versions
  }, [actions, userId])

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
  }, [actions, loadProject, loadVersions, searchParams, setSearchParams, userId])

  const persistProject = useCallback(async (project: Project): Promise<Project> => {
    actions.setSaving(true)
    actions.setSaveError(null)

    const payload: Project = {
      ...project,
      chat_history: chatMessages,
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
  }, [actions, chatMessages, searchParams, setSearchParams, userId])

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

  useEffect(() => {
    if (!currentProject || !isDirty) return

    if (autoSaveTimerRef.current) {
      window.clearTimeout(autoSaveTimerRef.current)
    }

    autoSaveTimerRef.current = window.setTimeout(() => {
      void persistProject({
        ...currentProject,
        chat_history: chatMessages,
      })
    }, 3000)

    return () => {
      if (autoSaveTimerRef.current) {
        window.clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [chatMessages, currentProject, isDirty, persistProject])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const modifierKey = navigator.platform.includes('Mac') ? event.metaKey : event.ctrlKey

      if (event.code === 'Space') {
        const activeElement = document.activeElement
        const isTextInput = activeElement?.tagName === 'TEXTAREA' || activeElement?.tagName === 'INPUT'
        if (!isTextInput) {
          event.preventDefault()
          if (isPlaying) {
            editorStopRef.current?.()
          } else {
            editorPlayRef.current?.()
          }
        }
      }

      if (modifierKey && event.key.toLowerCase() === 's') {
        event.preventDefault()
        if (!currentProject) return
        void saveVersionSnapshot(currentProject, getCurrentCodeRef.current?.() ?? currentProject.strudel_code, 'Manual save', 'user')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentProject, isPlaying, saveVersionSnapshot])

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCycleInfo(getCycleInfoRef.current?.() ?? null)
    }, 100)
    return () => window.clearInterval(interval)
  }, [])

  const handleSendMessage = useCallback(async (content: string) => {
    if (!currentProject) return

    setIsSending(true)
      const userMessage: ChatMessage = {
        id: createId(),
        role: 'user',
        content,
        timestamp: new Date().toISOString(),
    }

    actions.appendMessage(userMessage)

    try {
      const currentCode = getCurrentCodeRef.current?.() ?? currentProject.strudel_code
      const response = await api.chat({
        project_id: currentProject.id,
        messages: [...chatMessages, userMessage].map(({ role, content: itemContent }) => ({ role, content: itemContent })),
        current_code: currentCode,
        project_meta: {
          bpm: currentProject.bpm,
          key: currentProject.key,
          tags: currentProject.tags,
        },
      }, userId)

      const assistantMessage: ChatMessage = {
        id: createId(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date().toISOString(),
      }

      if (response.has_code_change && response.code) {
        const diff = buildCodeDiff(currentCode, response.code, response.diff_summary || 'Updated the Strudel arrangement')
        assistantMessage.code_diff = diff
        assistantMessage.status = 'pending'
      }

      actions.appendMessage(assistantMessage)

      if (assistantMessage.code_diff) {
        actions.setPendingDiff(assistantMessage.id, assistantMessage.code_diff)
      }
    } catch (error) {
      actions.appendMessage({
        id: createId(),
        role: 'assistant',
        content: error instanceof Error ? error.message : 'Chat request failed.',
        timestamp: new Date().toISOString(),
      })
    } finally {
      setIsSending(false)
    }
  }, [actions, chatMessages, currentProject, userId])

  const handleApplyDiff = useCallback((diff: { before: string; after: string; summary: string }) => {
    if (!currentProject) return

    editorSetCodeRef.current?.(diff.after)
    actions.setCode(diff.after)

    if (isPlaying) {
      window.setTimeout(() => {
        editorEvaluateRef.current?.()
      }, 60)
    }

    if (pendingDiff && pendingDiff.diff.after === diff.after) {
      actions.applyDiff()
    }

    void saveVersionSnapshot(currentProject, diff.after, 'Applied AI patch', 'ai')
  }, [actions, currentProject, isPlaying, pendingDiff, saveVersionSnapshot])

  const handleRejectDiff = useCallback((diff: { before: string; after: string; summary: string }) => {
    if (pendingDiff && pendingDiff.diff.after === diff.after) {
      actions.rejectDiff()
    }
  }, [actions, pendingDiff])

  const handleParamChange = useCallback((param: ExtractedParam, nextValue: number) => {
    const sourceCode = getCurrentCodeRef.current?.() ?? currentProject?.strudel_code ?? ''
    const nextCode = updateDetectedParamInCode(sourceCode, param, nextValue)
    editorSetCodeRef.current?.(nextCode)
    actions.setCode(nextCode)

    if (isPlaying) {
      if (paramEvaluateTimerRef.current) {
        window.clearTimeout(paramEvaluateTimerRef.current)
      }

      paramEvaluateTimerRef.current = window.setTimeout(() => {
        editorEvaluateRef.current?.()
      }, 120)
    }
  }, [actions, currentProject?.strudel_code, isPlaying])

  const handleRestoreVersion = useCallback(async (version: CodeVersion) => {
    if (!currentProject) return

    setIsRestoringVersion(true)
    setVersionError(null)

    try {
      if (pendingDiff) {
        actions.rejectDiff()
      }

      const currentCode = getCurrentCodeRef.current?.() ?? currentProject.strudel_code
      await saveVersionSnapshot(currentProject, currentCode, 'Before restore', 'user')

      editorSetCodeRef.current?.(version.code)
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
  }, [actions, currentProject, loadVersions, pendingDiff, persistProject, saveVersionSnapshot])

  useEffect(() => {
    return () => {
      if (paramEvaluateTimerRef.current) {
        window.clearTimeout(paramEvaluateTimerRef.current)
      }
    }
  }, [])

  if (isLoadingProject || !currentProject) {
    return <main className="flex min-h-screen items-center justify-center bg-[#050505] text-zinc-400">Loading project...</main>
  }

  const loadTemplateProject = (template: 'empty' | 'demo') => {
    if (isPlaying) {
      editorStopRef.current?.()
    }

    actions.rejectDiff()
    const project = createProjectTemplate(userId, template)
    editorSetCodeRef.current?.(project.strudel_code)
    actions.setProject(project)
    saveLocalProject(project)
    setSearchParams({ project: project.id })
    setShareUrl(null)
    setVersionError(null)
  }

  return (
    <main className="h-screen overflow-hidden bg-[#050505] px-2 py-2 text-white sm:px-3 sm:py-3 lg:px-4 lg:py-4">
      <div className="mx-auto flex h-full min-h-0 max-w-[1680px] flex-col gap-2 overflow-hidden sm:gap-3">
        <ProjectTopbar
          projectName={currentProject.name}
          bpm={currentProject.bpm}
          musicalKey={currentProject.key}
          isPlaying={isPlaying}
          isSaving={isSaving}
          isDirty={isDirty}
          error={strudelError || saveError}
          onProjectNameChange={actions.setProjectName}
          onBpmChange={(bpm) => actions.setCode(upsertSetcpsFromBpm(getCurrentCodeRef.current?.() ?? currentProject.strudel_code, bpm))}
          onKeyChange={actions.setProjectKey}
          onPlay={() => editorPlayRef.current?.()}
          onStop={() => editorStopRef.current?.()}
          onSave={() => {
            void saveVersionSnapshot(currentProject, getCurrentCodeRef.current?.() ?? currentProject.strudel_code, 'Manual save', 'user')
          }}
          onUndo={() => editorUndoRef.current?.()}
          onRedo={() => editorRedoRef.current?.()}
          onNewProject={() => loadTemplateProject('empty')}
          onLoadDemo={() => loadTemplateProject('demo')}
          onExportTxt={() => downloadFile(`${currentProject.name}.txt`, currentProject.strudel_code, 'text/plain')}
          onExportProject={() => downloadFile(`${currentProject.name}.strudel`, JSON.stringify(currentProject, null, 2), 'application/json')}
          onShare={() => {
            api.shareCode(currentProject.strudel_code).then((response) => setShareUrl(response.url)).catch(() => setShareUrl('Share failed'))
          }}
        />

        <div className="grid min-h-0 flex-1 gap-2 overflow-hidden xl:grid-cols-[minmax(300px,0.34fr)_minmax(0,0.66fr)] 2xl:grid-cols-[minmax(340px,0.33fr)_minmax(0,0.67fr)]">
          <ChatPanel
            messages={chatMessages}
            isSending={isSending}
            onSend={handleSendMessage}
            onApplyDiff={handleApplyDiff}
            onRejectDiff={handleRejectDiff}
          />

          <section className="flex min-h-0 flex-col gap-3 overflow-hidden">
            <Card className="min-h-0 flex-1 overflow-hidden border-zinc-900 bg-black/55 text-white shadow-none">
              <CardContent className="grid h-full min-h-0 gap-2 overflow-hidden p-2 sm:gap-3 sm:p-3 2xl:grid-cols-[minmax(0,1fr)_280px]">
                <div className="min-h-0 overflow-auto rounded-2xl border border-zinc-900 bg-gradient-to-br from-zinc-950 via-[#090909] to-zinc-950 p-2 sm:p-4">
                  <StrudelEditor
                    initialCode={currentProject.strudel_code}
                    onCodeChange={actions.setCode}
                    onPlayReady={(playFn) => {
                      editorPlayRef.current = playFn
                    }}
                    onStopReady={(stopFn) => {
                      editorStopRef.current = stopFn
                    }}
                    onUndoReady={(undoFn) => {
                      editorUndoRef.current = undoFn
                    }}
                    onRedoReady={(redoFn) => {
                      editorRedoRef.current = redoFn
                    }}
                    onGetCurrentCode={(getCode) => {
                      getCurrentCodeRef.current = getCode
                    }}
                    onEvaluateReady={(evaluateFn) => {
                      editorEvaluateRef.current = evaluateFn
                    }}
                    onSetCodeReady={(setCode) => {
                      editorSetCodeRef.current = setCode
                    }}
                    onCycleInfoReady={(getCycleInfo) => {
                      getCycleInfoRef.current = getCycleInfo
                    }}
                    onJumpToLineReady={(jumpToLine) => {
                      jumpToLineRef.current = jumpToLine
                    }}
                    onPlayStateChange={actions.setPlaying}
                    onInitStateChange={(initialized, initializing) => {
                      setIsEditorInitialized(initialized)
                      setIsEditorInitializing(initializing)
                    }}
                    onStrudelError={actions.setStrudelError}
                    onCodeEvaluated={() => actions.setStrudelError(null)}
                  />
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
                        <span className="text-xs text-zinc-500">{pendingDiff ? 'One AI patch awaiting review' : 'No pending patch'}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>

            <div className="grid min-h-0 gap-2 overflow-auto lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)] 2xl:grid-cols-[minmax(0,1fr)_minmax(260px,300px)_minmax(260px,300px)]">
              <Card className="min-h-0 border-zinc-900 bg-black/55 text-white shadow-none">
                <CardContent className="space-y-3 p-3 sm:p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold">Section strip</p>
                      <p className="text-xs text-zinc-500">Comment markers map to clickable DAW regions.</p>
                    </div>
                    <div className="flex items-center gap-2 self-start rounded-full bg-zinc-950 px-3 py-1.5 text-xs text-zinc-400">
                      <Sparkles className="h-3.5 w-3.5 text-purple-300" />
                      AI diff review enabled
                    </div>
                  </div>

                  <div className="hidden md:block">
                    <VisualizationBar isPlaying={isPlaying} phase={cycleInfo?.phase ?? 0} />
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-zinc-900">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 transition-all duration-100"
                      style={{ width: `${Math.max(3, (cycleInfo?.phase ?? 0) * 100)}%` }}
                    />
                  </div>

                  <SectionStrip
                    sections={sections}
                    activeSection={activeSection}
                    onSelect={(section) => {
                      actions.setActiveSection(section.label)
                      jumpToLineRef.current?.(section.line)
                    }}
                  />
                </CardContent>
              </Card>

              <Card className="min-h-0 border-zinc-900 bg-black/55 text-white shadow-none">
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
                            onChange={(event) => handleParamChange(param, Number(event.target.value))}
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

              <VersionHistoryPanel
                versions={currentProject.versions}
                isLoading={isLoadingVersions}
                isRestoring={isRestoringVersion}
                error={versionError}
                onRefresh={() => void loadVersions(currentProject.id)}
                onRestore={(version) => {
                  void handleRestoreVersion(version)
                }}
              />
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}

export default HomePage
