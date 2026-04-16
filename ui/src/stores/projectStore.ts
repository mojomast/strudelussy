import { create } from 'zustand'
import type { ChatMessage, ChatModel, CodeDiff, ExtractedParam, LightingProjectState, Project, SectionMarker, SystemPromptMode } from '@/types/project'
import { DEFAULT_CHAT_MODEL, DEFAULT_SYSTEM_PROMPT_MODE } from '@/types/project'
import { extractParams, parseBpmFromCode, parseKeyFromCode, parseSections } from '@/lib/codeParser'
import { createId } from '@/lib/utils'

interface PendingDiffState {
  messageId: string
  diff: CodeDiff
  isPreviewing: boolean
}

export const MAX_CHAT_HISTORY_FOR_API = 20

export const trimChatHistoryForApi = (messages: ChatMessage[]) =>
  messages
    .filter((message) => message.role !== 'system')
    .slice(-MAX_CHAT_HISTORY_FOR_API)
    .map(({ role, content }) => ({ role, content }))

interface ProjectStore {
  currentProject: Project | null
  chatMessages: ChatMessage[]
  pendingDiffs: Map<string, PendingDiffState>
  activeSection: string | null
  params: ExtractedParam[]
  sections: SectionMarker[]
  selectedModel: ChatModel
  systemPromptMode: SystemPromptMode
  isDirty: boolean
  isSaving: boolean
  saveError: string | null
  lastSavedAt: string | null
  isPlaying: boolean
  strudelError: string | null
  actions: {
    setProject: (project: Project) => void
    setProjectName: (name: string) => void
    setProjectKey: (key: string) => void
    setLighting: (lighting: LightingProjectState) => void
    setCode: (code: string) => void
    setChatMessages: (messages: ChatMessage[]) => void
    appendMessage: (message: ChatMessage) => void
    setPendingDiff: (messageId: string, diff: CodeDiff) => void
    applyDiff: (messageId: string) => CodeDiff | null
    rejectDiff: (messageId: string) => void
    setDiffPreviewing: (messageId: string, isPreviewing: boolean) => void
    setSaving: (isSaving: boolean) => void
    setSaveError: (message: string | null) => void
    markSaved: (timestamp: string) => void
    setPlaying: (isPlaying: boolean) => void
    setStrudelError: (error: string | null) => void
    setActiveSection: (label: string | null) => void
    setSelectedModel: (model: ChatModel) => void
    setSystemPromptMode: (mode: SystemPromptMode) => void
    upsertVersion: (code: string, label: string | undefined, createdBy: 'user' | 'ai') => void
    replaceVersions: (versions: Project['versions']) => void
  }
}

const deriveProject = (project: Project): Project => ({
  ...project,
  lighting: project.lighting ?? { cue_bindings: [], group_bindings: [] },
  bpm: project.bpm ?? parseBpmFromCode(project.strudel_code),
  key: project.key ?? parseKeyFromCode(project.strudel_code),
})

const markMessageStatus = (messages: ChatMessage[], messageId: string, status: 'applied' | 'rejected') =>
  messages.map((message) => (message.id === messageId ? { ...message, status } : message))

const syncChatHistory = (state: ProjectStore, chatMessages: ChatMessage[]) => ({
  chatMessages,
  currentProject: state.currentProject
    ? { ...state.currentProject, chat_history: chatMessages, updated_at: new Date().toISOString() }
    : state.currentProject,
  isDirty: true,
})

export const useProjectStore = create<ProjectStore>((set, get) => ({
  currentProject: null,
  chatMessages: [],
  pendingDiffs: new Map(),
  activeSection: null,
  params: [],
  sections: [],
  selectedModel: DEFAULT_CHAT_MODEL,
  systemPromptMode: DEFAULT_SYSTEM_PROMPT_MODE,
  isDirty: false,
  isSaving: false,
  saveError: null,
  lastSavedAt: null,
  isPlaying: false,
  strudelError: null,
  actions: {
    setProject: (project) => {
      const nextProject = deriveProject(project)
      set({
        currentProject: nextProject,
        chatMessages: nextProject.chat_history,
        pendingDiffs: new Map(),
        activeSection: null,
        sections: parseSections(nextProject.strudel_code),
        params: extractParams(nextProject.strudel_code),
        isDirty: false,
        saveError: null,
        strudelError: null,
      })
    },

    setProjectName: (name) =>
      set((state) => {
        if (!state.currentProject) return state
        return {
          currentProject: { ...state.currentProject, name, updated_at: new Date().toISOString() },
          isDirty: true,
        }
      }),

    setProjectKey: (key) =>
      set((state) => {
        if (!state.currentProject) return state
        return {
          currentProject: { ...state.currentProject, key, updated_at: new Date().toISOString() },
          isDirty: true,
        }
      }),

    setLighting: (lighting) =>
      set((state) => {
        if (!state.currentProject) return state
        return {
          currentProject: { ...state.currentProject, lighting, updated_at: new Date().toISOString() },
          isDirty: true,
        }
      }),

    setCode: (code) =>
      set((state) => {
        if (!state.currentProject || state.currentProject.strudel_code === code) {
          return state
        }

        return {
          currentProject: {
            ...state.currentProject,
            strudel_code: code,
            bpm: parseBpmFromCode(code) ?? state.currentProject.bpm,
            key: parseKeyFromCode(code) ?? state.currentProject.key,
            updated_at: new Date().toISOString(),
          },
          sections: parseSections(code),
          params: extractParams(code),
          isDirty: true,
        }
      }),

    setChatMessages: (messages) =>
      set((state) => {
        if (!state.currentProject) return state
        return {
          chatMessages: messages,
          currentProject: { ...state.currentProject, chat_history: messages, updated_at: new Date().toISOString() },
          isDirty: true,
        }
      }),

    appendMessage: (message) => {
      const messages = [...get().chatMessages, message]
      get().actions.setChatMessages(messages)
    },

    setPendingDiff: (messageId, diff) =>
      set((state) => {
        const pendingDiffs = new Map(state.pendingDiffs)
        pendingDiffs.set(messageId, { messageId, diff, isPreviewing: false })
        const chatMessages = state.chatMessages.map((message) =>
          message.id === messageId ? { ...message, code_diff: diff, status: 'pending' as const } : message,
        )
        return {
          pendingDiffs,
          ...syncChatHistory(state, chatMessages),
        }
      }),

    applyDiff: (messageId) => {
      const pendingDiff = get().pendingDiffs.get(messageId)
      if (!pendingDiff) return null

      get().actions.setCode(pendingDiff.diff.after)
      set((state) => {
        const pendingDiffs = new Map(state.pendingDiffs)
        pendingDiffs.delete(messageId)
        const chatMessages = markMessageStatus(state.chatMessages, pendingDiff.messageId, 'applied').map((message) =>
          message.id === pendingDiff.messageId ? { ...message, isPreviewing: false } : message,
        )
        return {
          pendingDiffs,
          ...syncChatHistory(state, chatMessages),
        }
      })
      return pendingDiff.diff
    },

    rejectDiff: (messageId) => {
      const pendingDiff = get().pendingDiffs.get(messageId)
      if (!pendingDiff) return
      set((state) => {
        const pendingDiffs = new Map(state.pendingDiffs)
        pendingDiffs.delete(messageId)
        const chatMessages = markMessageStatus(state.chatMessages, pendingDiff.messageId, 'rejected').map((message) =>
          message.id === pendingDiff.messageId ? { ...message, isPreviewing: false } : message,
        )
        return {
          pendingDiffs,
          ...syncChatHistory(state, chatMessages),
        }
      })
    },

    setDiffPreviewing: (messageId, isPreviewing) =>
      set((state) => {
        const pendingDiff = state.pendingDiffs.get(messageId)
        const pendingDiffs = new Map(state.pendingDiffs)
        if (pendingDiff) {
          pendingDiffs.set(messageId, { ...pendingDiff, isPreviewing })
        }
        const chatMessages = state.chatMessages.map((message) =>
          message.id === messageId ? { ...message, isPreviewing } : message,
        )
        return {
          pendingDiffs,
          ...syncChatHistory(state, chatMessages),
        }
      }),

    setSaving: (isSaving) => set({ isSaving }),
    setSaveError: (saveError) => set({ saveError }),
    markSaved: (lastSavedAt) => set({ lastSavedAt, isSaving: false, isDirty: false, saveError: null }),
    setPlaying: (isPlaying) => set({ isPlaying }),
    setStrudelError: (strudelError) => set({ strudelError }),
    setActiveSection: (activeSection) => set({ activeSection }),
    setSelectedModel: (selectedModel) => set({ selectedModel }),
    setSystemPromptMode: (systemPromptMode) => set({ systemPromptMode }),

    upsertVersion: (code, label, createdBy) =>
      set((state) => {
        if (!state.currentProject) return state
        const version = {
          id: createId(),
          code,
          label,
          created_at: new Date().toISOString(),
          created_by: createdBy,
        }
        return {
          currentProject: { ...state.currentProject, versions: [version, ...state.currentProject.versions] },
        }
      }),

    replaceVersions: (versions) =>
      set((state) => {
        if (!state.currentProject) return state
        return {
          currentProject: { ...state.currentProject, versions },
        }
      }),
  },
}))
