import { Hono } from 'hono'
import OpenAI from 'openai'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import type { Env } from '../index'
import { STRUDEL_DOCS } from '../lib/strudel-docs'

interface ChatPayload {
  project_id?: string
  messages: { role: string; content: string }[]
  current_code: string
  project_meta?: { bpm?: number; key?: string; tags?: string[] }
}

interface AIResponse {
  message: string
  code?: string
  diff_summary?: string
  has_code_change: boolean
}

const unsupportedPatterns = [
  /\.bend\s*\([^)]*\)/g,
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
    nextCode = nextCode.replace(pattern, '')
  }
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

    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: buildSystemPrompt(payload) },
      ...payload.messages.map((message) => ({
        role: message.role === 'assistant' || message.role === 'system' ? message.role : 'user',
        content: message.content,
      })) as ChatCompletionMessageParam[],
    ]

    const completion = await openai.chat.completions.create({
      model: c.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash',
      temperature: 0.6,
      messages,
    })

    const content = completion.choices[0]?.message?.content?.trim()
    if (!content) {
      return c.json({ error: 'LLM returned an empty response' }, 502)
    }

    return c.json(parseJsonResponse(content))
  } catch (error) {
    console.error('Error handling chat:', error)
    return c.json({
      error: 'Failed to process chat request',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500)
  }
})
