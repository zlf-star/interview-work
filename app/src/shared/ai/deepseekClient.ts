import { extractBestEffortJson, safeParseJson } from './streamJson'
import type { ModelJsonOutput } from '../types/interviewTypes'

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

export type DeepSeekStreamArgs = {
  model?: string
  temperature?: number
  messages: ChatMessage[]
  onDeltaContent?: (delta: string) => void
  signal?: AbortSignal
}

type OpenAIStreamChunk = {
  choices?: Array<{
    delta?: { content?: string }
    text?: string
  }>
}

function getEnv(name: string): string {
  const v = import.meta.env[name as keyof ImportMetaEnv] as unknown
  if (typeof v !== 'string' || !v) {
    throw new Error(`Missing environment variable: ${name}`)
  }
  return v
}

// Vite 的 ImportMetaEnv 类型在此处做一个最小化兜底，避免额外依赖
declare global {
  interface ImportMetaEnv {
    VITE_DEEPSEEK_API_KEY?: string
    VITE_DEEPSEEK_BASE_URL?: string
    VITE_DEEPSEEK_MODEL?: string
  }
}

export async function streamDeepSeekChatCompletions<T = ModelJsonOutput>(
  args: DeepSeekStreamArgs,
): Promise<{ rawText: string; parsed?: T; error?: string }> {
  const apiKey = getEnv('VITE_DEEPSEEK_API_KEY')
  const baseUrl = getEnv('VITE_DEEPSEEK_BASE_URL')
  const model = args.model ?? getEnv('VITE_DEEPSEEK_MODEL')
  const temperature = args.temperature ?? 0.7

  const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature,
      stream: true,
      messages: args.messages,
    }),
    signal: args.signal,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`DeepSeek request failed: ${res.status} ${text}`)
  }

  if (!res.body) {
    throw new Error('DeepSeek response body is empty')
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder('utf-8')

  let rawText = ''
  let sseBuffer = ''
  let streamDone = false

  const handleDataLine = (data: string) => {
    if (data.trim() === '[DONE]') {
      streamDone = true
      return
    }

    const parsedChunk = safeParseJson<OpenAIStreamChunk>(data)
    if (!parsedChunk.parsed) return

    const deltaContent =
      parsedChunk.parsed.choices?.[0]?.delta?.content ??
      parsedChunk.parsed.choices?.[0]?.text ??
      ''
    if (deltaContent) {
      rawText += deltaContent
      args.onDeltaContent?.(deltaContent)
    }
  }

  while (!streamDone) {
    const { value, done } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })
    sseBuffer += chunk

    // SSE typically uses double-newline to separate events.
    const parts = sseBuffer.split(/\n\n/)
    sseBuffer = parts.pop() ?? ''

    for (const part of parts) {
      const lines = part.split('\n')
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const data = trimmed.slice('data:'.length).trim()
        if (!data) continue
        handleDataLine(data)
      }
    }
  }

  const bestJson = extractBestEffortJson(rawText)
  if (!bestJson) {
    return { rawText, error: 'No JSON object found in model output' }
  }

  const parsed = safeParseJson<T>(bestJson)
  if (!parsed.parsed) {
    return { rawText, error: parsed.error ?? 'JSON parse error' }
  }

  return { rawText, parsed: parsed.parsed }
}

