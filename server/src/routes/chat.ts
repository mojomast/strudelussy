import { Hono } from 'hono'
import { streamText } from 'hono/streaming'
import OpenAI from 'openai'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import type { Env } from '../index'
import { STRUDEL_DOCS } from '../lib/strudel-docs'

const ALLOWED_MODELS = [
  'google/gemini-2.5-flash',
  'google/gemini-3.1-flash-lite-preview',
  'google/gemini-3-flash-preview',
] as const

const MAX_CHAT_HISTORY = 20
const MAX_CODE_LENGTH = 8000

interface ChatPayload {
  project_id?: string
  messages: { role: string; content: string }[]
  current_code: string
  model?: string
  project_meta?: { bpm?: number; key?: string; tags?: string[] }
}

interface AIResponse {
  message: string
  code?: string
  diff_summary?: string
  has_code_change: boolean
}

const unsupportedPatterns: RegExp[] = [
  /\.bend\s*\([^)]*(?:\([^)]*\)[^)]*)*\)/g,
  /\.stutter\s*\([^)]*(?:\([^)]*\)[^)]*)*\)/g,
  /\.bounce\s*\([^)]*(?:\([^)]*\)[^)]*)*\)/g,
  /\.pingpong\s*\([^)]*(?:\([^)]*\)[^)]*)*\)/g,
  /\.trancegate\s*\([^)]*(?:\([^)]*\)[^)]*)*\)/g,
  /\.rlpf\s*\([^)]*(?:\([^)]*\)[^)]*)*\)/g,
  /\.acidenv\s*\([^)]*(?:\([^)]*\)[^)]*)*\)/g,
]

const unsupportedSoundNames = ['chirp']

export const chatRoute = new Hono<{ Bindings: Env }>()

const buildSystemPrompt = (payload: ChatPayload) => `You are a music production AI assistant working inside a Strudel live coding environment.

Current Strudel code:
\`\`\`strudel
${payload.current_code}
\`\`\`

Project metadata:
- BPM: ${payload.project_meta?.bpm ?? 'unknown'}
- Key: ${payload.project_meta?.key ?? 'unknown'}
- Tags: ${(payload.project_meta?.tags || []).join(', ') || 'none'}

Your job is to help the user create and modify music using Strudel's mini-notation and pattern API.
When modifying code, ALWAYS return valid JSON matching this exact shape:
{
  "message": "brief conversational response",
  "code": "full updated Strudel code when a change is needed",
  "diff_summary": "short summary of the change",
  "has_code_change": true
}

Rules:
- Never truncate or omit code.
- Never use placeholder comments.
- Prefer incremental changes.
- Do not use unsupported methods such as .bend().
- Favor conservative, commonly supported Strudel functions like s, note, n, sound, gain, room, delay, slow, fast, stack, cat, mini, color, scale.
- Do not invent unsupported sound names like chirp unless you have explicitly loaded a compatible sample pack and know the sound exists.
- For built-in drums prefer bd, sd, hh, cp, rim, lt, mt, ht, perc. For melodic instruments prefer working gm_ instruments already present in the code.
- Use Euclidean rhythms for drums: s("bd(3,16)").bank("RolandTR808") is always preferred over manual sequencing.
- Use .mask("<0!N 1!M>") to arrange when the user asks for song structure or sections to appear or disappear over time.
- Use .jux(rev) for subtle stereo interest on melodic patterns.
- Use .off(1/8, x=>x.add(7)) on melodic tracks only (those using note() or n()). Never apply .off() to drum or sample patterns — it will produce broken output.
- Use .every(4, x=>x.rev()) for periodic variation.
- Named tracks: use named $ operators like drums$: or bass$: when generating multi-track code so sections are identifiable.
- If no code change is needed, omit the code field and set has_code_change to false.
- Return JSON only.

Condensed Strudel reference:
${STRUDEL_DOCS}`

const fallbackJsonResponse = (content: string): AIResponse => ({
  message: content || 'The model returned a non-JSON response.',
  has_code_change: false,
})

const sanitizeCode = (code: string): string => {
  let nextCode = code
  for (const pattern of unsupportedPatterns) {
    nextCode = nextCode.replace(pattern, ' /* unsupported pattern removed */')
  }
  nextCode = nextCode.replace(/\bawait\s+/g, '')
  for (const soundName of unsupportedSoundNames) {
    nextCode = nextCode.replace(new RegExp(`\\b${soundName}\\b`, 'g'), 'hh')
  }
  return nextCode
}

const extractJsonObject = (content: string): string | null => {
  const start = content.indexOf('{')
  const end = content.lastIndexOf('}')

  if (start === -1 || end === -1 || end <= start) {
    return null
  }

  return content.slice(start, end + 1)
}

const parseJsonResponse = (content: string): AIResponse => {
  const cleaned = content
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim()

  const jsonCandidate = cleaned.startsWith('{') ? cleaned : extractJsonObject(cleaned)
  if (!jsonCandidate) {
    return fallbackJsonResponse(cleaned)
  }

  let parsed: AIResponse
  try {
    parsed = JSON.parse(jsonCandidate) as AIResponse
  } catch {
    return fallbackJsonResponse(cleaned)
  }

  const sanitizedCode = parsed.code ? sanitizeCode(parsed.code) : undefined
  if (sanitizedCode && sanitizedCode.length > MAX_CODE_LENGTH) {
    return {
      message: 'The proposed code change is too large to review safely. Ask for a smaller, more focused change.',
      has_code_change: false,
    }
  }

  return {
    message: parsed.message || 'Updated the project.',
    code: sanitizedCode,
    diff_summary: parsed.diff_summary,
    has_code_change: Boolean(parsed.has_code_change && sanitizedCode),
  }
}

chatRoute.post('/', async (c) => {
  try {
    if (c.env.RATE_LIMITER_IP) {
      const clientIP = c.req.header('cf-connecting-ip') || 'anonymous'
      const { success } = await c.env.RATE_LIMITER_IP.limit({ key: clientIP })

      if (!success) {
        return c.json({ error: 'Rate limit exceeded. Please wait a moment before sending more prompts.' }, 429)
      }
    }

    const payload = await c.req.json<ChatPayload>()
    if (!Array.isArray(payload.messages) || typeof payload.current_code !== 'string') {
      return c.json({ error: 'messages and current_code are required' }, 400)
    }

    const openai = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: c.env.OPENROUTER_API_KEY,
      defaultHeaders: {
        'HTTP-Referer': c.env.APP_URL || 'http://localhost:5173',
        'X-Title': 'strudelussy chat',
      },
    })

    const selectedModel = (ALLOWED_MODELS.includes((payload.model || '') as (typeof ALLOWED_MODELS)[number])
      ? payload.model
      : c.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash') as (typeof ALLOWED_MODELS)[number] | string

    const recentMessages = payload.messages.filter((message) => message.role !== 'system').slice(-MAX_CHAT_HISTORY)

    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: buildSystemPrompt(payload) },
      ...recentMessages.map((message) => ({
        role: message.role === 'assistant' || message.role === 'system' ? message.role : 'user',
        content: message.content,
      })) as ChatCompletionMessageParam[],
    ]

    c.header('Content-Type', 'text/event-stream')
    c.header('Cache-Control', 'no-cache')
    c.header('Connection', 'keep-alive')

    return streamText(c, async (stream) => {
      const completion = await openai.chat.completions.create({
        model: selectedModel,
        temperature: 0.6,
        messages,
        stream: true,
      })

      let content = ''

      for await (const chunk of completion) {
        const delta = chunk.choices[0]?.delta?.content ?? ''
        if (!delta) continue
        content += delta
        await stream.write(`data: ${JSON.stringify({ type: 'chunk', chunk: delta })}\n\n`)
      }

      if (!content.trim()) {
        await stream.write(`data: ${JSON.stringify({ type: 'error', error: 'LLM returned an empty response' })}\n\n`)
        await stream.write('data: [DONE]\n\n')
        return
      }

      const parsed = parseJsonResponse(content.trim())
      await stream.write(`data: ${JSON.stringify({ type: 'done', response: parsed })}\n\n`)
      await stream.write('data: [DONE]\n\n')
    })
  } catch (error) {
    console.error('Error handling chat:', error)
    return c.json({
      error: 'Failed to process chat request',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500)
  }
})
