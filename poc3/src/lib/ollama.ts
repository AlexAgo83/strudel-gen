const env = {
  model: import.meta.env.VITE_OLLAMA_MODEL as string | undefined,
  apiKey: import.meta.env.VITE_OLLAMA_API_KEY as string | undefined,
  host: import.meta.env.VITE_OLLAMA_HOST as string | undefined,
}

export async function pingOllama(): Promise<{ version?: string }> {
  let res: Response
  try {
    res = await fetch('/ollama/api/version')
  } catch {
    const hostHint = env.host ? ` (${env.host})` : ''
    throw new Error(`Cannot reach Ollama${hostHint}. Is it running?`)
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Ollama ping failed (${res.status}): ${text || res.statusText}`)
  }
  const json = (await res.json()) as { version?: string }
  return json
}

export async function chat(prompt: string): Promise<string> {
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
        messages: [{ role: 'user', content: prompt }],
        options: { temperature: 0.6 },
      }),
    })
  } catch {
    const hostHint = env.host ? ` (${env.host})` : ''
    throw new Error(`Cannot reach Ollama${hostHint}. Is it running?`)
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
