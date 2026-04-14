import type { AIResponse, ChatMessage, CodeVersion, Project, ProjectSummary } from '@/types/project'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787'

type ProjectUpdate = Partial<Project> & Pick<Project, 'id'>

const request = async <T>(path: string, options: RequestInit = {}, userId?: string): Promise<T> => {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(userId ? { 'x-user-id': userId } : {}),
      ...(options.headers ?? {}),
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message || error.error || `Request failed: ${response.status}`)
  }

  return response.json() as Promise<T>
}

export const api = {
  createProject: (project: Partial<Project>, userId: string) =>
    request<Project>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(project),
    }, userId),

  listProjects: (userId: string) => request<ProjectSummary[]>('/api/projects', {}, userId),

  getProject: (projectId: string, userId: string) => request<Project>(`/api/projects/${projectId}`, {}, userId),

  updateProject: (project: ProjectUpdate, userId: string) =>
    request<Project>(`/api/projects/${project.id}`, {
      method: 'PUT',
      body: JSON.stringify(project),
    }, userId),

  deleteProject: (projectId: string, userId: string) =>
    request<{ success: true }>(`/api/projects/${projectId}`, {
      method: 'DELETE',
    }, userId),

  createVersion: (projectId: string, payload: { code: string; label?: string; created_by: 'user' | 'ai' }, userId: string) =>
    request<CodeVersion[]>(`/api/projects/${projectId}/versions`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }, userId),

  getVersions: (projectId: string, userId: string) => request<CodeVersion[]>(`/api/projects/${projectId}/versions`, {}, userId),

  chat: (payload: { project_id?: string; messages: Pick<ChatMessage, 'role' | 'content'>[]; current_code: string; project_meta: { bpm?: number; key?: string; tags?: string[] } }, userId: string) =>
    request<AIResponse>('/api/chat', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, userId),

  shareCode: (code: string) =>
    request<{ id: string; url: string }>('/api/share', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  loadSharedCode: (shareId: string) => request<{ code: string }>(`/api/share/${shareId}`),
}
