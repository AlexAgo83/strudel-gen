import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { chat, pingOllama } from './lib/ollama'

function getDefaultPrompt() {
  return 'Write a short explanation of what Strudel is, in French.'
}

export default function App() {
  const model = useMemo(() => (import.meta.env.VITE_OLLAMA_MODEL as string | undefined) || 'qwen3', [])
  const [prompt, setPrompt] = useState(() => getDefaultPrompt())
  const [response, setResponse] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>('')
  const [ollamaStatus, setOllamaStatus] = useState<{ ok: boolean; detail: string }>({
    ok: false,
    detail: 'Checking Ollama…',
  })

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

  async function handleSend() {
    setBusy(true)
    setError('')
    setResponse('')
    try {
      const out = await chat(prompt)
      setResponse(out)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function handleCopy() {
    if (!response.trim()) return
    try {
      await navigator.clipboard.writeText(response)
    } catch {
      // ignore
    }
  }

  return (
    <div className="wrap">
      <div className="top">
        <div className="title">
          <h1>POC2 — Prompt → response</h1>
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
            {busy ? 'Sending…' : 'Send'}
          </button>
          <button onClick={() => setPrompt('')} disabled={busy}>
            Clear prompt
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

      <div className="grid">
        <div className="card">
          <div className="label">Response</div>
          <pre className="out">{response || (busy ? '…' : '')}</pre>
          <div className="actions">
            <button onClick={handleCopy} disabled={busy || !response.trim()}>
              Copy response
            </button>
            <button onClick={() => setResponse('')} disabled={busy || !response}>
              Clear response
            </button>
          </div>
        </div>

        <div className="card">
          <div className="label">Notes</div>
          <div className="hint">
            - This POC calls Ollama via <code>/ollama/api/chat</code> (Vite dev proxy to avoid CORS).
            <br />
            - No streaming yet; it waits for the full response.
            <br />- No Strudel integration in this POC.
          </div>
        </div>
      </div>
    </div>
  )
}
