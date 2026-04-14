import type { Project } from '@/types/project'
import { createId } from '@/lib/utils'

const PROJECTS_KEY = 'strudelussy.projects'
const LAST_PROJECT_KEY = 'strudelussy.lastProjectId'
const USER_KEY = 'strudelussy.userId'

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
