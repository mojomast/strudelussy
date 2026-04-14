export const CHAT_MODELS = [
  'google/gemini-2.5-flash',
  'google/gemini-3.1-flash-lite-preview',
  'google/gemini-3-flash-preview',
  'openai/gpt-5.4-mini',
] as const

export type ChatModel = (typeof CHAT_MODELS)[number]

export interface CodeDiff {
  before: string
  after: string
  summary: string
}

export interface CodeVersion {
  id: string
  code: string
  label?: string
  created_at: string
  created_by: 'user' | 'ai'
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  code_diff?: CodeDiff
  status?: 'pending' | 'applied' | 'rejected' | 'error'
  isPreviewing?: boolean
  timestamp: string
}

export interface Project {
  id: string
  user_id: string
  name: string
  description?: string
  strudel_code: string
  chat_history: ChatMessage[]
  versions: CodeVersion[]
  bpm?: number
  key?: string
  tags: string[]
  is_public?: boolean
  created_at: string
  updated_at: string
}

export interface ProjectSummary {
  id: string
  name: string
  bpm?: number
  key?: string
  tags: string[]
  updated_at: string
}

export interface SectionMarker {
  label: string
  line: number
}

export interface ExtractedParam {
  id: string
  label: string
  value: number
  min: number
  max: number
  kind: 'gain' | 'speed' | 'room' | 'cps'
  expression: string
  valueStart: number
  valueEnd: number
}

export interface AIResponse {
  message: string
  code?: string
  diff_summary?: string
  has_code_change: boolean
}
