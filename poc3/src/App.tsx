import { useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import './App.css'
import { chatStreamMessages, pingOllama, type ChatMessage, type ChatStreamProgress } from './lib/ollama'

function getDefaultPrompt() {
  return 'Write a short explanation of what Strudel is, in French.'
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
  const [rawResponse, setRawResponse] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>('')
  const [ollamaStatus, setOllamaStatus] = useState<{ ok: boolean; detail: string }>({
    ok: false,
    detail: 'Checking Ollama…',
  })
  const [progress, setProgress] = useState<ChatStreamProgress | null>(null)
  const startRef = useRef<number | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const [keepContext, setKeepContext] = useState(false)
  const [contextMessages, setContextMessages] = useState<ChatMessage[]>([])

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

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const base: ChatMessage[] = keepContext ? contextMessages : []
    const userMessage: ChatMessage = { role: 'user', content: promptToSend }

    setBusy(true)
    setError('')
    setRawResponse('')
    setProgress({ chunks: 0, chars: 0, elapsedMs: 0 })
    startRef.current = performance.now()
    try {
      const out = await chatStreamMessages([...base, userMessage], {
        signal: controller.signal,
        onUpdate: (content, p) => {
          setRawResponse(content)
          setProgress(p)
        },
      })
      setRawResponse(out)

      const { answer } = splitReflection(out)
      const assistantMessage: ChatMessage = { role: 'assistant', content: (answer || out).trim() }
      setContextMessages([...base, userMessage, assistantMessage])
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        setError('Cancelled.')
      } else {
        setError(e instanceof Error ? e.message : String(e))
      }
    } finally {
      setBusy(false)
      abortRef.current = null
    }
  }

  function handleStop() {
    abortRef.current?.abort()
  }

  async function handleCopy() {
    if (!renderedAnswer.trim()) return
    try {
      await navigator.clipboard.writeText(renderedAnswer)
    } catch {
      // ignore
    }
  }

  function handleClearContext() {
    setContextMessages([])
  }

  const { reflection, answer: renderedAnswer } = useMemo(() => splitReflection(rawResponse), [rawResponse])

  return (
    <div className="wrap">
      <div className="content">
        <div className="top">
          <div className="title">
            <h1>POC3 — Prompt → response</h1>
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
            <div className="label">Response</div>
            {busy ? (
              <span className="pill small">
                Streaming · {formatElapsed(progress?.elapsedMs ?? 0)} · {(progress?.chars ?? 0).toLocaleString()} chars
              </span>
            ) : null}
          </div>

          {reflection ? (
            <details className="reflection" open={busy}>
              <summary>Reflection (if available)</summary>
              <pre className="reflectionOut">{reflection}</pre>
            </details>
          ) : null}

          <div className="out md">
            {renderedAnswer ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{renderedAnswer}</ReactMarkdown>
            ) : busy ? (
              '…'
            ) : null}
          </div>
          <div className="actions">
            <button onClick={handleStop} disabled={!busy}>
              Stop
            </button>
            <button onClick={handleCopy} disabled={busy || !renderedAnswer.trim()}>
              Copy response
            </button>
            <button onClick={() => setRawResponse('')} disabled={busy || !rawResponse}>
              Clear response
            </button>
          </div>
        </div>
      </div>

      <footer className="footer">
        {__APP_NAME__} v{__APP_VERSION__}
      </footer>
    </div>
  )
}
