import { useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import './App.css'
import { chatStreamMessages, pingOllama, type ChatMessage, type ChatStreamProgress } from './lib/ollama'
import { ensureStrudelInitialized, playCode, stopPlayback } from './lib/strudel'

function getDefaultPrompt() {
  return 'Generate an 8-bar Strudel groove with drums + a simple melody. Use sound(...) for drums and note(...) or n(...).sound(...) for melody. Keep it to 2–3 lines total. Reply only with Strudel code in one fenced code block.'
}

const STRUDEL_SYSTEM_PROMPT = [
  'You are a Strudel (https://strudel.cc) expert.',
  'Follow the Strudel workshop getting-started basics:',
  '- Use sound("...") patterns for drums (e.g., "bd hh sd oh").',
  '- Use note("...").sound("piano") or n("...").scale("C:minor").sound("piano") for melody.',
  '- Set tempo with setcpm(<number>) (cycles per minute).',
  '- To play multiple parts, prefix each line with $: (e.g., $: sound(...), $: note(...)).',
  '- Keep output short: 1 optional setcpm line + 2 pattern lines.',
  '- Do NOT use pattern(...), ellipses (...), or placeholders.',
  'Return ONLY Strudel code inside a single Markdown fenced code block (```strudel).',
  'No explanations, no prose, no extra Markdown outside the code block.',
  'Example structure (keep this exact 2-part shape):',
  '```strudel',
  'setcpm(120)',
  '$: sound("bd hh sd hh")',
  '$: note("c2 e3 g4 e3").sound("piano")',
  '```',
].join('\n')

const SAFE_FALLBACK_CODE = ['setcpm(120)', '$: sound("bd hh sd hh")', '$: note("c2 e3 g4 e3").sound("piano")'].join(
  '\n',
)

function sanitizeStrudelCode(raw: string): string {
  const lines = raw
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length === 0) return ''

  const expanded: string[] = []
  for (const line of lines) {
    if (line.includes('$:')) {
      const parts = line.split('$:')
      const head = parts.shift()?.trim()
      if (head) expanded.push(head)
      for (const part of parts) {
        const chunk = part.trim()
        if (chunk) expanded.push(`$:${chunk}`)
      }
      continue
    }
    expanded.push(line)
  }

  if (expanded.length === 0) return ''

  const setTempo = expanded.find((line) => /setcp[ms]\(/i.test(line))
  const patternLines = expanded.filter((line) => line.startsWith('$:'))
  if (patternLines.length >= 2) {
    const lines = [...(setTempo ? [setTempo] : []), patternLines[0], patternLines[1]]
    return lines.join('\n')
  }

  return expanded.slice(0, 12).join('\n')
}

function validateStrudelCode(code: string): { ok: true } | { ok: false; error: string } {
  if (!code.trim()) return { ok: false, error: 'Empty code.' }
  if (code.includes('...')) return { ok: false, error: 'Contains placeholder "...".' }
  if (/\.pattern\(/i.test(code)) return { ok: false, error: 'Uses pattern(...), which is not allowed here.' }

  const lines = code
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const setcpmRe = /^setcp[ms]\(\s*\d+(\.\d+)?\s*\)$/i
  const soundRe = /^\$:\s*sound\("([^"]+)"\)\s*$/i
  const noteRe = /^\$:\s*note\("([^"]+)"\)\.sound\("([^"]+)"\)\s*$/i
  const nRe = /^\$:\s*n\("([^"]+)"\)\.scale\("([^"]+)"\)\.sound\("([^"]+)"\)\s*$/i

  let patternLines = 0
  for (const line of lines) {
    if (setcpmRe.test(line)) continue
    if (soundRe.test(line)) {
      patternLines += 1
      continue
    }
    if (noteRe.test(line)) {
      patternLines += 1
      continue
    }
    if (nRe.test(line)) {
      patternLines += 1
      continue
    }
    return { ok: false, error: `Invalid line: ${line}` }
  }

  if (patternLines < 2) return { ok: false, error: 'Expected two $: pattern lines.' }
  return { ok: true }
}

function extractStrudelCode(raw: string): string {
  const text = raw.trim()
  if (!text) return ''

  const inlineFenceMatch = text.match(/^```[a-zA-Z0-9_-]*\s*([\s\S]*?)```$/)
  if (inlineFenceMatch?.[1]?.trim()) return sanitizeStrudelCode(inlineFenceMatch[1].trim())

  const fence = /```[^\n]*\n([\s\S]*?)```/g
  let match: RegExpExecArray | null = null
  let last = ''
  while ((match = fence.exec(text))) {
    last = match[1]?.trim() ?? ''
  }
  if (last) return sanitizeStrudelCode(last)

  const stripped = text.replace(/^```[^\n]*\n?/g, '').replace(/```$/g, '').trim()
  return sanitizeStrudelCode(stripped)
}

function extractAndValidateStrudelCode(raw: string): { code: string; warning?: string } {
  const extracted = extractStrudelCode(raw)
  const validation = validateStrudelCode(extracted)
  if (validation.ok) return { code: extracted }
  return { code: SAFE_FALLBACK_CODE, warning: validation.error }
}

function splitReflection(raw: string): { reflection: string; answer: string } {
  const tags = [
    { open: '<think>', close: '</think>' },
    { open: '<analysis>', close: '</analysis>' },
    { open: '<reflection>', close: '</reflection>' },
  ]

  let answer = raw
  const reflections: string[] = []

  for (const t of tags) {
    const lower = answer.toLowerCase()
    const openIndex = lower.indexOf(t.open)
    if (openIndex === -1) continue
    const afterOpen = openIndex + t.open.length
    const closeIndex = lower.indexOf(t.close, afterOpen)
    if (closeIndex === -1) {
      const chunk = answer.slice(afterOpen).trim()
      if (chunk) reflections.push(chunk)
      answer = answer.slice(0, openIndex)
      continue
    }
    const chunk = answer.slice(afterOpen, closeIndex).trim()
    if (chunk) reflections.push(chunk)
    answer = answer.slice(0, openIndex) + answer.slice(closeIndex + t.close.length)
  }

  return { reflection: reflections.join('\n\n').trim(), answer: answer.trimStart() }
}

function formatElapsed(ms: number) {
  const sec = Math.floor(ms / 1000)
  const remMs = Math.floor(ms % 1000)
  if (sec < 60) return `${sec}.${String(Math.floor(remMs / 100)).padStart(1, '0')}s`
  const min = Math.floor(sec / 60)
  const rem = sec % 60
  return `${min}m${String(rem).padStart(2, '0')}s`
}

export default function App() {
  const model = useMemo(() => (import.meta.env.VITE_OLLAMA_MODEL as string | undefined) || 'qwen3', [])
  const [prompt, setPrompt] = useState(() => getDefaultPrompt())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>('')
  const [ollamaStatus, setOllamaStatus] = useState<{ ok: boolean; detail: string }>({
    ok: false,
    detail: 'Checking Ollama…',
  })
  const [progress, setProgress] = useState<ChatStreamProgress | null>(null)
  const startRef = useRef<number | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const [keepContext, setKeepContext] = useState(true)
  const [contextMessages, setContextMessages] = useState<ChatMessage[]>([])
  const [history, setHistory] = useState<
    {
      id: number
      prompt: string
      raw: string
      answer: string
      reflection: string
      code?: string
      codeWarning?: string
      createdAt: number
      streaming: boolean
      error?: string
    }[]
  >([])
  const historyIdRef = useRef(0)
  const [streamingId, setStreamingId] = useState<number | null>(null)
  const [playingId, setPlayingId] = useState<number | null>(null)
  const [audioError, setAudioError] = useState<string>('')
  const [showRawStream, setShowRawStream] = useState(false)
  const audioContextWarning = useMemo(() => {
    if (typeof window === 'undefined') return ''
    const host = window.location.hostname
    const isLocalhost = host === 'localhost' || host === '127.0.0.1' || host === '[::1]'
    if (window.isSecureContext || isLocalhost) return ''
    return 'Audio may fail on non-secure origins. Use http://localhost or HTTPS on LAN.'
  }, [])
  const systemMessages = useMemo<ChatMessage[]>(() => [{ role: 'system', content: STRUDEL_SYSTEM_PROMPT }], [])

  useEffect(() => {
    let cancelled = false
    pingOllama()
      .then(({ version }) => {
        if (cancelled) return
        setOllamaStatus({ ok: true, detail: `Ollama OK${version ? ` (v${version})` : ''}` })
      })
      .catch((e: unknown) => {
        if (cancelled) return
        const message = e instanceof Error ? e.message : String(e)
        setOllamaStatus({ ok: false, detail: message })
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    return () => {
      stopPlayback()
    }
  }, [])

  useEffect(() => {
    if (!busy || startRef.current === null) return
    const timer = window.setInterval(() => {
      const elapsedMs = Math.max(0, Math.round(performance.now() - (startRef.current ?? performance.now())))
      setProgress((prev) => (prev ? { ...prev, elapsedMs: Math.max(prev.elapsedMs, elapsedMs) } : { chunks: 0, chars: 0, elapsedMs }))
    }, 150)
    return () => window.clearInterval(timer)
  }, [busy])

  async function handleSend() {
    const promptToSend = prompt.trim()
    if (!promptToSend) return
    setPrompt('')
    stopPlayback()
    setPlayingId(null)
    setAudioError('')

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const base: ChatMessage[] = keepContext ? contextMessages : []
    const userMessage: ChatMessage = { role: 'user', content: promptToSend }
    const messages: ChatMessage[] = [...systemMessages, ...base, userMessage]
    const id = (historyIdRef.current += 1)
    const createdAt = Date.now()

    setBusy(true)
    setError('')
    setProgress({ chunks: 0, chars: 0, elapsedMs: 0 })
    startRef.current = performance.now()
    setStreamingId(id)
    setHistory((prev) => [
      {
        id,
        prompt: promptToSend,
        raw: '',
        answer: '',
        reflection: '',
        code: '',
        createdAt,
        streaming: true,
      },
      ...prev,
    ])
    try {
      const out = await chatStreamMessages(messages, {
        signal: controller.signal,
        onUpdate: (content, p) => {
          setProgress(p)
          const { reflection, answer } = splitReflection(content)
          const code = extractStrudelCode(answer)
          setHistory((prev) =>
            prev.map((item) =>
              item.id === id
                ? {
                    ...item,
                    raw: content,
                    reflection,
                    answer,
                    code: code || item.code,
                    streaming: true,
                  }
                : item,
            ),
          )
        },
      })

      const { reflection, answer } = splitReflection(out)
      const validated = extractAndValidateStrudelCode(answer)
      const assistantMessage: ChatMessage = { role: 'assistant', content: (answer || out).trim() }
      setContextMessages([...base, userMessage, assistantMessage])
      setHistory((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                raw: out,
                reflection,
                answer: assistantMessage.content,
                code: validated.code || item.code,
                codeWarning: validated.warning,
                streaming: false,
              }
            : item,
        ),
      )
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        setError('Cancelled.')
        setHistory((prev) =>
          prev.map((item) => (item.id === id ? { ...item, streaming: false, error: 'Cancelled.' } : item)),
        )
      } else {
        const message = e instanceof Error ? e.message : String(e)
        setError(message)
        setHistory((prev) =>
          prev.map((item) => (item.id === id ? { ...item, streaming: false, error: message } : item)),
        )
      }
    } finally {
      setBusy(false)
      setStreamingId(null)
      abortRef.current = null
    }
  }

  function handleStop() {
    abortRef.current?.abort()
  }

  async function handleCopy() {
    const latest = history[0]
    const text = latest?.answer?.trim() ?? ''
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // ignore
    }
  }

  async function handleCopyCode(item?: { code?: string }) {
    const text = item?.code?.trim() ?? ''
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // ignore
    }
  }

  async function handlePlay(item?: { id: number; code?: string; answer?: string }) {
    // Prime AudioContext + preload samples in a user gesture.
    try {
      await ensureStrudelInitialized()
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to initialize Strudel audio.'
      setAudioError(message)
      return
    }
    const resolved = item?.code?.trim()
      ? { code: item.code.trim(), warning: undefined }
      : extractAndValidateStrudelCode(item?.answer ?? '')
    const code = resolved.code
    if (!code.trim()) {
      setAudioError('No Strudel code found to play.')
      setPlayingId(null)
      return
    }
    setAudioError('')
    setPlayingId(item?.id ?? null)
    try {
      await playCode(code)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to play Strudel code.'
      setAudioError(message)
      setPlayingId(null)
    }
  }

  function handleStopAudio() {
    stopPlayback()
    setPlayingId(null)
  }

  function handleClearContext() {
    setContextMessages([])
  }

  function handleClearHistory() {
    setHistory([])
    setProgress(null)
    setError('')
    setAudioError('')
    handleStopAudio()
  }

  return (
    <div className="wrap">
      <div className="content">
        <div className="top">
          <div className="title">
            <h1>POC4</h1>
            <span className="pill">Model: {model}</span>
          </div>
          <span className={`pill ${ollamaStatus.ok ? 'ok' : 'err'}`}>{ollamaStatus.detail}</span>
        </div>

        <div className="card">
          <div className="label">Prompt</div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Type your prompt…"
            spellCheck={false}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault()
                handleSend()
              }
            }}
          />
          <div className="actions">
            <button className="primary" onClick={handleSend} disabled={busy || !ollamaStatus.ok}>
              {busy ? 'Streaming…' : 'Send'}
            </button>
            <button onClick={() => setPrompt('')} disabled={busy}>
              Clear prompt
            </button>
            <label className="toggle" title="When enabled, the next request includes previous messages.">
              <input
                type="checkbox"
                checked={keepContext}
                onChange={(e) => setKeepContext(e.target.checked)}
                disabled={busy}
              />
              Keep context
            </label>
            <button onClick={handleClearContext} disabled={busy || contextMessages.length === 0}>
              Clear context
            </button>
          </div>

          {!ollamaStatus.ok ? (
            <div className="errbox">
              <div className="hint">
                Quick checklist:
                <br />
                1) Install Ollama: https://ollama.com/download
                <br />
                2) Pull the model: <code>ollama pull qwen3</code>
                <br />
                3) Run: <code>ollama serve</code> (or open the Ollama app)
              </div>
            </div>
          ) : null}

          {error ? <div className="errbox">{error}</div> : null}
        </div>

        <div className="card" style={{ marginTop: 14 }}>
          <div className="labelRow">
            <div className="label">History</div>
            <div className="labelMeta">
              {busy ? (
                <span className="pill small">
                  Streaming · {formatElapsed(progress?.elapsedMs ?? 0)} · {(progress?.chars ?? 0).toLocaleString()} chars
                </span>
              ) : null}
              {playingId ? <span className="pill ok small">Audio playing</span> : null}
            </div>
          </div>
          <div className="actions">
            <button onClick={handleStop} disabled={!busy}>
              Stop
            </button>
            <button onClick={() => handlePlay(history[0])} disabled={busy || !history[0]?.code?.trim()}>
              Play latest
            </button>
            <button onClick={handleStopAudio} disabled={!playingId}>
              Stop audio
            </button>
            <button onClick={handleCopy} disabled={busy || !history[0]?.answer?.trim()}>
              Copy latest
            </button>
            <button onClick={() => handleCopyCode(history[0])} disabled={busy || !history[0]?.code?.trim()}>
              Copy code
            </button>
            <button onClick={handleClearHistory} disabled={busy || history.length === 0}>
              Clear history
            </button>
            <label className="toggle" title="Show the raw streaming text as it arrives (debug).">
              <input
                type="checkbox"
                checked={showRawStream}
                onChange={(e) => setShowRawStream(e.target.checked)}
              />
              Show raw stream
            </label>
          </div>

          {audioError ? <div className="errbox">{audioError}</div> : null}
          {audioContextWarning ? <div className="warnbox">{audioContextWarning}</div> : null}

          <div className="historyList">
            {history.length === 0 ? <div className="hint">No responses yet.</div> : null}
            {history.map((item, index) => (
              <div key={item.id} className={`historyItem ${index === 0 ? 'latest' : ''}`}>
                <div className="historyMeta">
                  <span className="pill small">{new Date(item.createdAt).toLocaleTimeString()}</span>
                  {item.streaming || item.id === streamingId ? (
                    <span className="pill small">Streaming…</span>
                  ) : item.error ? (
                    <span className="pill err small">Error</span>
                  ) : (
                    <span className="pill ok small">Done</span>
                  )}
                </div>
                <div className="historyPrompt">
                  <div className="label">Prompt</div>
                  <div className="historyText">{item.prompt}</div>
                </div>

                {item.reflection ? (
                  <details className="reflection" open={item.streaming}>
                    <summary>Reflection (if available)</summary>
                    <pre className="reflectionOut">{item.reflection}</pre>
                  </details>
                ) : null}

                <div className="label">Response</div>
                <div className="out md">
                  {item.answer ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.answer}</ReactMarkdown>
                  ) : item.streaming ? (
                    '…'
                  ) : item.error ? (
                    item.error
                  ) : null}
                </div>

                <div className="labelRow codeRow">
                  <div className="label">Strudel code</div>
                  <div className="codeActions">
                    <button onClick={() => handlePlay(item)} disabled={busy || item.streaming || !item.code?.trim()}>
                      Play
                    </button>
                    <button onClick={handleStopAudio} disabled={playingId !== item.id}>
                      Stop audio
                    </button>
                    <button onClick={() => handleCopyCode(item)} disabled={!item.code?.trim()}>
                      Copy code
                    </button>
                  </div>
                </div>
                {item.code?.trim() ? (
                  <pre className="codeOut">{item.code}</pre>
                ) : (
                  <div className="hint">No Strudel code detected in the response yet.</div>
                )}
                {item.codeWarning ? <div className="warnbox">Used fallback code: {item.codeWarning}</div> : null}
                {showRawStream ? (
                  <div className="rawStream">
                    <div className="label">Raw stream</div>
                    <pre className="rawOut">{item.raw || (item.streaming ? '…' : '')}</pre>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>

      <footer className="footer">
        {__APP_NAME__} v{__APP_VERSION__}
      </footer>
    </div>
  )
}
