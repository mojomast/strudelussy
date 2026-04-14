import { create } from 'zustand'
import type { ChatMessage, CodeDiff, ExtractedParam, Project, SectionMarker } from '@/types/project'
import { extractParams, parseBpmFromCode, parseKeyFromCode, parseSections } from '@/lib/codeParser'
import { createId } from '@/lib/utils'

interface PendingDiffState {
  messageId: string
  diff: CodeDiff
}

interface ProjectStore {
  currentProject: Project | null
  chatMessages: ChatMessage[]
  pendingDiff: PendingDiffState | null
  activeSection: string | null
  params: ExtractedParam[]
  sections: SectionMarker[]
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
    setCode: (code: string) => void
    setChatMessages: (messages: ChatMessage[]) => void
    appendMessage: (message: ChatMessage) => void
    setPendingDiff: (messageId: string, diff: CodeDiff) => void
    applyDiff: () => CodeDiff | null
    rejectDiff: () => void
    setSaving: (isSaving: boolean) => void
    setSaveError: (message: string | null) => void
    markSaved: (timestamp: string) => void
    setPlaying: (isPlaying: boolean) => void
    setStrudelError: (error: string | null) => void
    setActiveSection: (label: string | null) => void
    upsertVersion: (code: string, label: string | undefined, createdBy: 'user' | 'ai') => void
    replaceVersions: (versions: Project['versions']) => void
  }
}

const deriveProject = (project: Project): Project => ({
  ...project,
  bpm: project.bpm ?? parseBpmFromCode(project.strudel_code),
  key: project.key ?? parseKeyFromCode(project.strudel_code),
})

const markMessageStatus = (messages: ChatMessage[], messageId: string, status: 'applied' | 'rejected') =>
  messages.map((message) => (message.id === messageId ? { ...message, status } : message))

export const useProjectStore = create<ProjectStore>((set, get) => ({
  currentProject: null,
  chatMessages: [],
  pendingDiff: null,
  activeSection: null,
  params: [],
  sections: [],
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
        pendingDiff: null,
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
      set((state) => ({
        pendingDiff: { messageId, diff },
        chatMessages: state.chatMessages.map((message) =>
          message.id === messageId ? { ...message, code_diff: diff, status: 'pending' } : message,
        ),
      })),

    applyDiff: () => {
      const pendingDiff = get().pendingDiff
      if (!pendingDiff) return null

      get().actions.setCode(pendingDiff.diff.after)
      set((state) => ({
        pendingDiff: null,
        chatMessages: markMessageStatus(state.chatMessages, pendingDiff.messageId, 'applied'),
      }))
      return pendingDiff.diff
    },

    rejectDiff: () => {
      const pendingDiff = get().pendingDiff
      if (!pendingDiff) return
      set((state) => ({
        pendingDiff: null,
        chatMessages: markMessageStatus(state.chatMessages, pendingDiff.messageId, 'rejected'),
      }))
    },

    setSaving: (isSaving) => set({ isSaving }),
    setSaveError: (saveError) => set({ saveError }),
    markSaved: (lastSavedAt) => set({ lastSavedAt, isSaving: false, isDirty: false, saveError: null }),
    setPlaying: (isPlaying) => set({ isPlaying }),
    setStrudelError: (strudelError) => set({ strudelError }),
    setActiveSection: (activeSection) => set({ activeSection }),

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
