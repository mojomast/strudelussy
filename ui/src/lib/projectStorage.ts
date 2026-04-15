import { DEFAULT_SYSTEM_PROMPT_MODE } from '@/types/project'
import type { Project, SavedPromptPreset, SystemPromptMode } from '@/types/project'
import { createId } from '@/lib/utils'

const PROJECTS_KEY = 'strudelussy.projects'
const LAST_PROJECT_KEY = 'strudelussy.lastProjectId'
const USER_KEY = 'strudelussy.userId'
const CHAT_PROVIDER_KEY = 'strudelussy.chatProvider'
const PROMPT_PRESETS_KEY = 'strudelussy.promptPresets'

const canUseStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'

const readProjects = (): Record<string, Project> => {
  if (!canUseStorage()) return {}
  const raw = window.localStorage.getItem(PROJECTS_KEY)
  if (!raw) return {}

  try {
    return JSON.parse(raw) as Record<string, Project>
  } catch {
    return {}
  }
}

const writeProjects = (projects: Record<string, Project>) => {
  if (!canUseStorage()) return
  window.localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects))
}

export const getOrCreateGuestUserId = (): string => {
  if (!canUseStorage()) {
    return 'guest-session'
  }

  const existing = window.localStorage.getItem(USER_KEY)
  if (existing) return existing

  const created = createId('guest')
  window.localStorage.setItem(USER_KEY, created)
  return created
}

export const saveLocalProject = (project: Project) => {
  const projects = readProjects()
  projects[project.id] = project
  writeProjects(projects)
  if (canUseStorage()) {
    window.localStorage.setItem(LAST_PROJECT_KEY, project.id)
  }
}

export const loadLocalProject = (projectId: string): Project | null => {
  const projects = readProjects()
  return projects[projectId] ?? null
}

export const listLocalProjects = (): Project[] => {
  return Object.values(readProjects()).sort((left, right) => right.updated_at.localeCompare(left.updated_at))
}

export const deleteLocalProject = (projectId: string) => {
  const projects = readProjects()
  delete projects[projectId]
  writeProjects(projects)
}

export const getLastProjectId = (): string | null => {
  if (!canUseStorage()) return null
  return window.localStorage.getItem(LAST_PROJECT_KEY)
}

export interface StoredChatProviderConfig {
  endpoint: string
  apiKey: string
  selectedModel: string
  systemPromptMode: SystemPromptMode
  customSystemPrompt: string
}

export const loadChatProviderConfig = (): StoredChatProviderConfig | null => {
  if (!canUseStorage()) return null
  const raw = window.localStorage.getItem(CHAT_PROVIDER_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<StoredChatProviderConfig>
    return {
      endpoint: parsed.endpoint || '',
      apiKey: parsed.apiKey || '',
      selectedModel: parsed.selectedModel || '',
      systemPromptMode: parsed.systemPromptMode || DEFAULT_SYSTEM_PROMPT_MODE,
      customSystemPrompt: parsed.customSystemPrompt || '',
    }
  } catch {
    return null
  }
}

export const saveChatProviderConfig = (config: StoredChatProviderConfig | null) => {
  if (!canUseStorage()) return
  if (!config) {
    window.localStorage.removeItem(CHAT_PROVIDER_KEY)
    return
  }

  window.localStorage.setItem(CHAT_PROVIDER_KEY, JSON.stringify(config))
}

export const loadPromptPresets = (): SavedPromptPreset[] => {
  if (!canUseStorage()) return []
  const raw = window.localStorage.getItem(PROMPT_PRESETS_KEY)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw) as SavedPromptPreset[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export const savePromptPresets = (presets: SavedPromptPreset[]) => {
  if (!canUseStorage()) return
  window.localStorage.setItem(PROMPT_PRESETS_KEY, JSON.stringify(presets))
}

export const upsertPromptPreset = (label: string, content: string): SavedPromptPreset[] => {
  const trimmedLabel = label.trim() || 'Untitled prompt'
  const now = new Date().toISOString()
  const presets = loadPromptPresets()
  const existing = presets.find((preset) => preset.label === trimmedLabel)

  const nextPresets = existing
    ? presets.map((preset) =>
        preset.id === existing.id
          ? { ...preset, content, updatedAt: now }
          : preset,
      )
    : [{ id: createId('prompt'), label: trimmedLabel, content, createdAt: now, updatedAt: now }, ...presets]

  savePromptPresets(nextPresets)
  return nextPresets
}
