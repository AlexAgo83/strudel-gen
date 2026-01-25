import { z } from 'zod'

const env = {
  model: import.meta.env.VITE_OLLAMA_MODEL as string | undefined,
  apiKey: import.meta.env.VITE_OLLAMA_API_KEY as string | undefined,
  host: import.meta.env.VITE_OLLAMA_HOST as string | undefined,
}

const generationSchema = z.object({
  title: z.string().optional(),
  bpm: z.number().int().min(40).max(240),
  bars: z.number().int().min(1).max(64),
  code: z.string().min(1),
})

export type Generation = z.infer<typeof generationSchema>
export type GenerateResult = { generation: Generation; raw: string }

export class ModelOutputError extends Error {
  raw: string
  constructor(message: string, raw: string) {
    super(message)
    this.name = 'ModelOutputError'
    this.raw = raw
  }
}

function extractLikelyJsonObject(text: string): string {
  const cleaned = text
    .trim()
    .replaceAll('```json', '')
    .replaceAll('```', '')
    .trim()

  const first = cleaned.indexOf('{')
  const last = cleaned.lastIndexOf('}')
  if (first === -1 || last === -1 || last <= first) return cleaned
  return cleaned.slice(first, last + 1)
}

function buildSystemPrompt(): string {
  return [
    'You generate Strudel code for beginners.',
    'Return ONLY a JSON object matching this exact schema:',
    '{"title":string?,"bpm":number,"bars":number,"code":string}',
    '',
    'The returned "bpm" and "bars" MUST exactly match the user constraints.',
    '',
    'Rules for "code":',
    '- Strudel expression only (no prose, no markdown, no backticks).',
    '- Do NOT call .play() or hush().',
    '- MUST start with one of: note(, n(, stack(, s(',
    '- No semicolons, no braces, no assignments.',
    '- Avoid samples(), github:, network, or anything that loads external resources.',
    '- Must be ONE LINE (no newline characters).',
    '- Keep it short (<= 200 characters).',
    '- Prefer synth-based patterns to guarantee sound: note("c a f e") and stack(note(...), note(...)).',
    '- Only use s("...") if you are sure samples are available (otherwise prefer note()).',
    '- MUST be a complete expression with balanced parentheses and quotes.',
    '- When evaluated, it should return a playable pattern (object with a .play() method).',
    '',
    'Prefer one of these templates:',
    '- note("c3 e3 g3 c4").s("sine").slow(2)',
    '- stack(note("c3 e3 g3 c4").s("sine"), note("g2 b2 d3 f#3").s("sawtooth")).slow(2)',
    '',
    'The user may write the prompt in French; handle it.',
  ].join('\n')
}

function buildUserPrompt(input: {
  prompt: string
  bpm: number
  bars: number
  style: string
  variation: 'simple' | 'balanced' | 'busy'
}): string {
  const { prompt, bpm, bars, style, variation } = input
  return [
    `Prompt: ${prompt || '(empty)'}`,
    `Style: ${style}`,
    `Speed (BPM): ${bpm}`,
    `Length (bars): ${bars}`,
    `Variation: ${variation}`,
    '',
    'Make it audible and loop-friendly.',
    'Use ONLY Strudel code that evaluates to a playable pattern.',
    'Preferred examples:',
    '- note("c3 e3 g3 c4").s("sine").slow(2)',
    '- stack(note("c3 e3 g3 c4").s("sine"), note("g2 b2 d3 f#3").s("sawtooth")).slow(2)',
  ].join('\n')
}

async function ollamaChat(messages: Array<{ role: 'system' | 'user'; content: string }>) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (env.apiKey?.trim()) headers.Authorization = `Bearer ${env.apiKey.trim()}`

  const model = env.model || 'qwen3'
  const format = {
    type: 'object',
    additionalProperties: false,
    properties: {
      title: { type: 'string' },
      bpm: { type: 'integer' },
      bars: { type: 'integer' },
      code: { type: 'string' },
    },
    required: ['bpm', 'bars', 'code'],
  }

  let res: Response
  try {
    res = await fetch('/ollama/api/chat', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        stream: false,
        format,
        messages,
        options: { temperature: 0.2, num_predict: 220 },
      }),
    })
  } catch {
    const hostHint = env.host ? ` (${env.host})` : ''
    throw new Error(`Cannot reach Ollama${hostHint}. Is it running?`)
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    const body = text || res.statusText
    const hostHint = env.host ? ` (${env.host})` : ''
    if (
      res.status >= 500 &&
      (body.includes('ECONNREFUSED') ||
        body.includes('socket hang up') ||
        body.includes('proxy') ||
        body.includes('connect ECONNREFUSED'))
    ) {
      throw new Error(`Cannot reach Ollama${hostHint}. Is it running?`)
    }
    throw new Error(`Ollama error (${res.status}): ${body}`)
  }

  const json = (await res.json()) as {
    message?: { content?: string }
    response?: string
  }

  const content = json.message?.content ?? json.response
  if (!content) throw new Error('Ollama returned no content.')
  return content
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

export async function generateStrudel(input: {
  prompt: string
  bpm: number
  bars: number
  style: string
  variation: 'simple' | 'balanced' | 'busy'
}): Promise<GenerateResult> {
  const system = buildSystemPrompt()
  const user = buildUserPrompt(input)

  const content = await ollamaChat([
    { role: 'system', content: system },
    { role: 'user', content: user },
  ])

  const jsonText = extractLikelyJsonObject(content)
  let data: unknown
  try {
    data = JSON.parse(jsonText)
  } catch {
    throw new ModelOutputError('Model output was not valid JSON.', content)
  }
  const parsed = generationSchema.safeParse(data)
  if (!parsed.success) {
    throw new ModelOutputError('Model output did not match the expected JSON schema.', content)
  }
  return {
    generation: {
      ...parsed.data,
      bpm: input.bpm,
      bars: input.bars,
      code: parsed.data.code.trim().replaceAll(/\s+/g, ' '),
    },
    raw: content,
  }
}

export async function repairStrudel(input: {
  previousOutput: string
  error: string
  bpm: number
  bars: number
  style: string
  variation: 'simple' | 'balanced' | 'busy'
}): Promise<GenerateResult> {
  const system = buildSystemPrompt()
  const user = [
    'Fix the previous output to match the required JSON schema and rules.',
    `Error: ${input.error}`,
    `Style: ${input.style}`,
    `Speed (BPM): ${input.bpm}`,
    `Length (bars): ${input.bars}`,
    `Variation: ${input.variation}`,
    '',
    'Previous output:',
    input.previousOutput,
  ].join('\n')

  const content = await ollamaChat([
    { role: 'system', content: system },
    { role: 'user', content: user },
  ])

  const jsonText = extractLikelyJsonObject(content)
  let data: unknown
  try {
    data = JSON.parse(jsonText)
  } catch {
    throw new ModelOutputError('Repair output was not valid JSON.', content)
  }
  const parsed = generationSchema.safeParse(data)
  if (!parsed.success) {
    throw new ModelOutputError('Repair output did not match the expected JSON schema.', content)
  }
  return {
    generation: {
      ...parsed.data,
      bpm: input.bpm,
      bars: input.bars,
      code: parsed.data.code.trim().replaceAll(/\s+/g, ' '),
    },
    raw: content,
  }
}
