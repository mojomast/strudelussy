import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FolderKanban, Sparkles } from 'lucide-react'
import StrudelEditor, { type CycleInfo } from '@/components/StrudelEditor'
import HalVisualization from '@/components/HalVisualization'
import ChatPanel from '@/components/ChatPanel'
import ProjectTopbar from '@/components/ProjectTopbar'
import SectionStrip from '@/components/SectionStrip'
import VisualizationBar from '@/components/VisualizationBar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { api } from '@/lib/api'
import { buildCodeDiff } from '@/lib/diffUtils'
import { parseBpmFromCode, parseKeyFromCode, upsertSetcpsFromBpm } from '@/lib/codeParser'
import { getLastProjectId, getOrCreateGuestUserId, loadLocalProject, saveLocalProject } from '@/lib/projectStorage'
import { useProjectStore } from '@/stores/projectStore'
import type { ChatMessage, Project } from '@/types/project'

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
  .scale("C:minor")
  .s("gm_epiano1")
  .slow(2)
  .gain(0.65)
  .color("orange")`

const createDefaultProject = (userId: string): Project => {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    user_id: userId,
    name: 'New Strudelussy Session',
    strudel_code: DEFAULT_CODE,
    chat_history: [
      {
        id: crypto.randomUUID(),
        role: 'system',
        content: 'Project initialized. Ask the AI to evolve the groove, add sections, or fix code before it reaches the editor.',
        timestamp: now,
      },
    ],
    versions: [],
    bpm: parseBpmFromCode(DEFAULT_CODE),
    key: parseKeyFromCode(DEFAULT_CODE),
    tags: ['guest'],
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

  const editorPlayRef = useRef<(() => void) | null>(null)
  const editorStopRef = useRef<(() => void) | null>(null)
  const editorUndoRef = useRef<(() => void) | null>(null)
  const editorRedoRef = useRef<(() => void) | null>(null)
  const getCurrentCodeRef = useRef<(() => string) | null>(null)
  const getCycleInfoRef = useRef<(() => CycleInfo | null) | null>(null)
  const jumpToLineRef = useRef<((line: number) => void) | null>(null)
  const autoSaveTimerRef = useRef<number | null>(null)

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

  const loadProject = useCallback(async (projectId?: string | null) => {
    setIsLoadingProject(true)

    const nextProjectId = projectId || searchParams.get('project') || getLastProjectId()

    if (!nextProjectId) {
      const project = createDefaultProject(userId)
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
    } catch {
      const fallbackProject = createDefaultProject(userId)
      actions.setProject(fallbackProject)
      saveLocalProject(fallbackProject)
      setSearchParams({ project: fallbackProject.id })
    } finally {
      setIsLoadingProject(false)
    }
  }, [actions, searchParams, setSearchParams, userId])

  useEffect(() => {
    const shareId = searchParams.get('share')
    if (shareId) {
      api.loadSharedCode(shareId).then((data) => {
        const project = createDefaultProject(userId)
        project.id = crypto.randomUUID()
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

  const persistProject = useCallback(async (project: Project) => {
    actions.setSaving(true)
    actions.setSaveError(null)

    const payload: Project = {
      ...project,
      chat_history: chatMessages,
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
    } catch (error) {
      actions.setSaveError(error instanceof Error ? error.message : 'Unable to save project to API. Local guest copy kept.')
      actions.markSaved(payload.updated_at)
    }
  }, [actions, chatMessages, searchParams, setSearchParams, userId])

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
        actions.upsertVersion(currentProject.strudel_code, 'Manual save', 'user')
        void persistProject({
          ...currentProject,
          chat_history: chatMessages,
        })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [actions, chatMessages, currentProject, isPlaying, persistProject])

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
      id: crypto.randomUUID(),
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
        id: crypto.randomUUID(),
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
        id: crypto.randomUUID(),
        role: 'assistant',
        content: error instanceof Error ? error.message : 'Chat request failed.',
        timestamp: new Date().toISOString(),
      })
    } finally {
      setIsSending(false)
    }
  }, [actions, chatMessages, currentProject, userId])

  const handleApplyDiff = useCallback(() => {
    const applied = actions.applyDiff()
    if (!applied || !currentProject) return
    actions.upsertVersion(applied.after, 'Applied AI patch', 'ai')
  }, [actions, currentProject])

  const handleRejectDiff = useCallback(() => {
    actions.rejectDiff()
  }, [actions])

  if (isLoadingProject || !currentProject) {
    return <main className="flex min-h-screen items-center justify-center bg-[#050505] text-zinc-400">Loading project...</main>
  }

  return (
    <main className="min-h-screen bg-[#050505] px-3 py-3 text-white sm:px-4 lg:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-24px)] max-w-[1800px] flex-col gap-3">
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
            actions.upsertVersion(currentProject.strudel_code, 'Manual save', 'user')
            void persistProject(currentProject)
          }}
          onUndo={() => editorUndoRef.current?.()}
          onRedo={() => editorRedoRef.current?.()}
          onExportTxt={() => downloadFile(`${currentProject.name}.txt`, currentProject.strudel_code, 'text/plain')}
          onExportProject={() => downloadFile(`${currentProject.name}.strudel`, JSON.stringify(currentProject, null, 2), 'application/json')}
          onShare={() => {
            api.shareCode(currentProject.strudel_code).then((response) => setShareUrl(response.url)).catch(() => setShareUrl('Share failed'))
          }}
        />

        <div className="grid flex-1 gap-3 xl:grid-cols-[minmax(360px,0.36fr)_minmax(0,0.64fr)]">
          <ChatPanel
            messages={chatMessages}
            isSending={isSending}
            onSend={handleSendMessage}
            onApplyDiff={handleApplyDiff}
            onRejectDiff={handleRejectDiff}
          />

          <section className="flex min-h-[420px] flex-col gap-3">
            <Card className="flex-1 overflow-hidden border-zinc-900 bg-black/55 text-white shadow-none">
              <CardContent className="grid h-full gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="overflow-auto rounded-2xl border border-zinc-900 bg-gradient-to-br from-zinc-950 via-[#090909] to-zinc-950 p-4">
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

                <div className="flex flex-col gap-3">
                  <div className="h-[260px] overflow-hidden rounded-2xl border border-zinc-900">
                    <HalVisualization isPlaying={isPlaying} isListening={false} />
                  </div>

                  <Card className="border-zinc-900 bg-zinc-950/80 text-white shadow-none">
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

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_360px]">
              <Card className="border-zinc-900 bg-black/55 text-white shadow-none">
                <CardContent className="space-y-4 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">Section strip</p>
                      <p className="text-xs text-zinc-500">Comment markers map to clickable DAW regions.</p>
                    </div>
                    <div className="flex items-center gap-2 rounded-full bg-zinc-950 px-3 py-1.5 text-xs text-zinc-400">
                      <Sparkles className="h-3.5 w-3.5 text-purple-300" />
                      AI diff review enabled
                    </div>
                  </div>

                  <VisualizationBar isPlaying={isPlaying} phase={cycleInfo?.phase ?? 0} />

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

              <Card className="border-zinc-900 bg-black/55 text-white shadow-none">
                <CardContent className="space-y-3 p-4">
                  <div>
                    <p className="text-sm font-semibold">Detected parameters</p>
                    <p className="text-xs text-zinc-500">Read-only MVP view. Slider editing is documented as next work.</p>
                  </div>
                  <div className="space-y-2">
                    {params.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-zinc-800 px-3 py-3 text-sm text-zinc-500">No tweakable parameters detected yet.</p>
                    ) : (
                      params.slice(0, 8).map((param) => (
                        <div key={param.id} className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-3">
                          <div className="flex items-center justify-between text-sm text-zinc-100">
                            <span>{param.label}</span>
                            <span className="text-zinc-400">{param.value}</span>
                          </div>
                          <div className="mt-2 h-2 rounded-full bg-zinc-900">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-purple-500"
                              style={{ width: `${((param.value - param.min) / (param.max - param.min || 1)) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}

export default HomePage
