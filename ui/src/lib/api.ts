import type { AIResponse, ChatMessage, ChatModel, CodeVersion, Project, ProjectSummary } from '@/types/project'

const API_URL = import.meta.env.VITE_API_URL || ''

type ProjectUpdate = Partial<Project> & Pick<Project, 'id'>

export interface ChatProviderOverride {
  endpoint: string
  apiKey: string
}

export interface ChatPayload {
  project_id?: string
  messages: Pick<ChatMessage, 'role' | 'content'>[]
  current_code: string
  model?: ChatModel
  provider?: ChatProviderOverride
  project_meta: { bpm?: number; key?: string; tags?: string[] }
}

interface ChatStreamHandlers {
  onChunk?: (chunk: string) => void
  onDone?: (response: AIResponse) => void
}

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

  getChatModels: (provider: ChatProviderOverride, userId: string) =>
    request<{ models: string[] }>('/api/chat/models', {
      method: 'POST',
      body: JSON.stringify({ provider }),
    }, userId),

  chat: (payload: ChatPayload, userId: string) =>
    request<AIResponse>('/api/chat', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, userId),

  chatStream: async (payload: ChatPayload, userId: string, handlers: ChatStreamHandlers = {}) => {
    const response = await fetch(`${API_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(userId ? { 'x-user-id': userId } : {}),
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({})) as Record<string, string>
      throw new Error(error['message'] || error['error'] || `Request failed: ${response.status}`)
    }

    if (!response.body) {
      throw new Error('Streaming response body unavailable')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let finalResponse: AIResponse | null = null
    let streamError: string | null = null

    const processLine = (rawEvent: string): boolean => {
      const lines = rawEvent.split('\n')
      let data = ''
      for (const line of lines) {
        if (!line.startsWith('data:')) continue
        data += `${line.slice(5).trimStart()}\n`
      }
      const payloadText = data.trim()
      if (!payloadText) return false
      if (payloadText === '[DONE]') return true

      let parsed: { type?: string; chunk?: string; response?: AIResponse; error?: string }
      try {
        parsed = JSON.parse(payloadText) as typeof parsed
      } catch {
        return false
      }

      if (parsed.type === 'chunk' && parsed.chunk) {
        handlers.onChunk?.(parsed.chunk)
        return false
      }
      if (parsed.type === 'error') {
        streamError = parsed.error || 'Streaming chat failed'
        return true
      }
      if (parsed.type === 'done' && parsed.response) {
        finalResponse = parsed.response
        return false
      }
      return false
    }

    let readerDone = false
    while (!readerDone) {
      const { done, value } = await reader.read()
      if (done) readerDone = true
      buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done })

      let boundaryIndex = buffer.indexOf('\n\n')
      while (boundaryIndex !== -1) {
        const rawEvent = buffer.slice(0, boundaryIndex)
        buffer = buffer.slice(boundaryIndex + 2)
        const streamDone = processLine(rawEvent)
        boundaryIndex = buffer.indexOf('\n\n')
        if (streamDone) {
          readerDone = true
          break
        }
      }
    }

    if (buffer.trim()) {
      processLine(buffer)
    }

    if (streamError) {
      throw new Error(streamError)
    }

    if (!finalResponse) {
      throw new Error('Streaming chat ended before final response was received')
    }

    handlers.onDone?.(finalResponse)
    return finalResponse
  },

  shareCode: (code: string) =>
    request<{ id: string; url: string }>('/api/share', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  loadSharedCode: (shareId: string) => request<{ code: string }>(`/api/share/${shareId}`),
}
