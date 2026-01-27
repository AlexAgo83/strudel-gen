const env = {
  model: import.meta.env.VITE_OLLAMA_MODEL as string | undefined,
  apiKey: import.meta.env.VITE_OLLAMA_API_KEY as string | undefined,
  host: import.meta.env.VITE_OLLAMA_HOST as string | undefined,
}

function hostHint() {
  return env.host ? ` (${env.host})` : ''
}

export async function pingOllama(): Promise<{ version?: string }> {
  let res: Response
  try {
    res = await fetch('/ollama/api/version')
  } catch {
    throw new Error(`Cannot reach Ollama${hostHint()}. Is it running?`)
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Ollama ping failed (${res.status}): ${text || res.statusText}`)
  }
  const json = (await res.json()) as { version?: string }
  return json
}

export type ChatStreamProgress = {
  chunks: number
  chars: number
  elapsedMs: number
}

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export async function chat(prompt: string): Promise<string> {
  return chatMessages([{ role: 'user', content: prompt }])
}

export async function chatMessages(messages: ChatMessage[]): Promise<string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (env.apiKey?.trim()) headers.Authorization = `Bearer ${env.apiKey.trim()}`

  const model = env.model || 'qwen3'

  let res: Response
  try {
    res = await fetch('/ollama/api/chat', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        stream: false,
        messages,
        options: { temperature: 0.6 },
      }),
    })
  } catch {
    throw new Error(`Cannot reach Ollama${hostHint()}. Is it running?`)
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Ollama error (${res.status}): ${text || res.statusText}`)
  }

  const json = (await res.json()) as { message?: { content?: string }; response?: string }
  const content = json.message?.content ?? json.response
  if (!content) throw new Error('Ollama returned no content.')
  return content
}

export async function chatStream(
  prompt: string,
  opts?: {
    signal?: AbortSignal
    onUpdate?: (content: string, progress: ChatStreamProgress) => void
  },
): Promise<string> {
  return chatStreamMessages(
    [{ role: 'user', content: prompt } satisfies ChatMessage],
    { signal: opts?.signal, onUpdate: opts?.onUpdate },
  )
}

export async function chatStreamMessages(
  messages: ChatMessage[],
  opts?: {
    signal?: AbortSignal
    onUpdate?: (content: string, progress: ChatStreamProgress) => void
  },
): Promise<string> {
  if (messages.length === 0) throw new Error('Missing messages.')
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (env.apiKey?.trim()) headers.Authorization = `Bearer ${env.apiKey.trim()}`

  const model = env.model || 'qwen3'

  let res: Response
  try {
    res = await fetch('/ollama/api/chat', {
      method: 'POST',
      headers,
      signal: opts?.signal,
      body: JSON.stringify({
        model,
        stream: true,
        messages,
        options: { temperature: 0.6 },
      }),
    })
  } catch (e: unknown) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e
    throw new Error(`Cannot reach Ollama${hostHint()}. Is it running?`)
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Ollama error (${res.status}): ${text || res.statusText}`)
  }

  if (!res.body) {
    const fallback = await chatMessages(messages)
    opts?.onUpdate?.(fallback, { chunks: 1, chars: fallback.length, elapsedMs: 0 })
    return fallback
  }

  const decoder = new TextDecoder()
  const reader = res.body.getReader()

  const startedAt = performance.now()
  let buffer = ''
  let content = ''
  let chunks = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      while (true) {
        const newlineIndex = buffer.indexOf('\n')
        if (newlineIndex === -1) break

        const line = buffer.slice(0, newlineIndex).trim()
        buffer = buffer.slice(newlineIndex + 1)
        if (!line) continue

        let json: unknown
        try {
          json = JSON.parse(line)
        } catch {
          continue
        }

        const obj = json as {
          done?: boolean
          message?: { content?: string }
          response?: string
        }

        const piece = obj.message?.content ?? obj.response ?? ''
        if (piece) {
          if (piece.startsWith(content)) content = piece
          else content += piece
        }

        chunks += 1
        opts?.onUpdate?.(content, {
          chunks,
          chars: content.length,
          elapsedMs: Math.max(0, Math.round(performance.now() - startedAt)),
        })

        if (obj.done) {
          await reader.cancel().catch(() => {})
          return content
        }
      }
    }
  } finally {
    reader.releaseLock()
  }

  if (!content.trim()) throw new Error('Ollama returned no content.')
  return content
}
