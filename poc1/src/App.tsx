import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { ModelOutputError, generateStrudel, pingOllama, repairStrudel, type Generation } from './lib/ollama'
import { validateStrudelCode } from './lib/guardrails'
import { decodeShareState, encodeShareState, type ShareStateV1 } from './lib/share'
import { ensureStrudelInitialized, evaluateToPlayable, playCode, stopPlayback } from './lib/strudel'
import { normalizeStrudelCode } from './lib/normalize'
import { heuristicFixToPlayable } from './lib/heuristics'

type Variation = 'simple' | 'balanced' | 'busy'

type HistoryItem = {
  id: string
  createdAt: string
  prompt: string
  bpm: number
  bars: number
  style: Style
  variation: Variation
  title?: string
  code?: string
  status: 'success' | 'error'
  error?: string
}

const HISTORY_KEY = 'strudel-gen.history.v1'
const STYLES = ['lofi', 'techno', 'hiphop', 'ambient', 'pop', 'cinematic'] as const
type Style = (typeof STYLES)[number]
function isStyle(s: string): s is (typeof STYLES)[number] {
  return (STYLES as readonly string[]).includes(s)
}
const DEFAULTS: { bpm: number; bars: number; style: Style; variation: Variation } = {
  bpm: 120,
  bars: 8,
  style: 'lofi',
  variation: 'balanced',
}

function App() {
  const [prompt, setPrompt] = useState('')
  const [bpm, setBpm] = useState(DEFAULTS.bpm)
  const [bars, setBars] = useState(DEFAULTS.bars)
  const [style, setStyle] = useState<Style>(DEFAULTS.style)
  const [variation, setVariation] = useState<Variation>(DEFAULTS.variation)

  const [title, setTitle] = useState<string>('')
  const [code, setCode] = useState<string>('')
  const [showCode, setShowCode] = useState<boolean>(false)

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>('')
  const [lastModelOutput, setLastModelOutput] = useState<string>('')
  const [ollamaStatus, setOllamaStatus] = useState<{ ok: boolean; detail: string }>({
    ok: false,
    detail: 'Checking…',
  })

  const [history, setHistory] = useState<HistoryItem[]>([])

  const shareState: ShareStateV1 | null = useMemo(() => {
    if (!code.trim()) return null
    return {
      v: 1,
      prompt,
      bpm,
      bars,
      style,
      variation,
      code,
      title: title || undefined,
    }
  }, [bars, bpm, code, prompt, style, title, variation])

  useEffect(() => {
    const stored = localStorage.getItem(HISTORY_KEY)
    if (!stored) return
    try {
      const parsed = JSON.parse(stored) as unknown
      if (!Array.isArray(parsed)) return
      const sanitized = parsed
        .filter((v): v is HistoryItem => {
          if (!v || typeof v !== 'object') return false
          const item = v as Partial<HistoryItem>
          return (
            typeof item.id === 'string' &&
            typeof item.createdAt === 'string' &&
            typeof item.prompt === 'string' &&
            typeof item.bpm === 'number' &&
            typeof item.bars === 'number' &&
            typeof item.style === 'string' &&
            isStyle(item.style) &&
            (item.variation === 'simple' || item.variation === 'balanced' || item.variation === 'busy') &&
            (item.status === 'success' || item.status === 'error')
          )
        })
        .map((it) => ({ ...it, style: it.style as Style }))
      setHistory(sanitized)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 20)))
    } catch {
      // ignore
    }
  }, [history])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const encoded = params.get('state')
    if (!encoded) return
    try {
      const restored = decodeShareState(encoded)
      if (restored?.v !== 1) return
      setPrompt(restored.prompt || '')
      setBpm(restored.bpm || DEFAULTS.bpm)
      setBars(restored.bars || DEFAULTS.bars)
      setStyle(isStyle(restored.style) ? restored.style : DEFAULTS.style)
      setVariation(restored.variation || DEFAULTS.variation)
      setCode(restored.code || '')
      setTitle(restored.title || '')
      setShowCode(true)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { version } = await pingOllama()
        if (cancelled) return
        const model = (import.meta.env.VITE_OLLAMA_MODEL as string | undefined) || 'qwen3'
        setOllamaStatus({ ok: true, detail: `Connected (v${version || '?'}) · model: ${model}` })
      } catch (e) {
        if (cancelled) return
        const message = e instanceof Error ? e.message : 'Cannot reach Ollama.'
        setOllamaStatus({ ok: false, detail: message })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleGenerate() {
    setBusy(true)
    setError('')
    setLastModelOutput('')
    void ensureStrudelInitialized()
    stopPlayback()

    try {
      const result = await generateStrudel({ prompt, bpm, bars, style, variation })
      setLastModelOutput(result.raw)
      await applyGenerationResult(result.generation, { rawModelOutput: result.raw })
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Generation failed.'
      const raw = e instanceof ModelOutputError ? e.raw : ''
      if (raw) setLastModelOutput(raw)
      if (raw) {
        try {
          const repaired = await repairStrudel({
            previousOutput: raw,
            error: message,
            bpm,
            bars,
            style,
            variation,
          })
          setLastModelOutput(repaired.raw)
          await applyGenerationResult(repaired.generation, { rawModelOutput: repaired.raw })
          return
        } catch {
          // fall through to error handling below
        }
      }
      setError(message)
      addHistory({
        prompt,
        bpm,
        bars,
        style,
        variation,
        status: 'error',
        error: message,
      })
    } finally {
      setBusy(false)
    }
  }

  async function applyGenerationResult(result: Generation, ctx: { rawModelOutput: string }) {
    const normalized = normalizeStrudelCode(result.code)
    const codeToUse = normalized.code
    const validation = validateStrudelCode(codeToUse)
    if (!validation.ok) {
      try {
        const repaired = await repairStrudel({
          previousOutput: ctx.rawModelOutput,
          error: validation.error,
          bpm,
          bars,
          style,
          variation,
        })
        setLastModelOutput(repaired.raw)
        const repairedNormalized = normalizeStrudelCode(repaired.generation.code)
        const repairedCode = repairedNormalized.code
        const repairedValidation = validateStrudelCode(repairedCode)
        if (!repairedValidation.ok) {
          throw new Error(`Blocked by guardrails: ${repairedValidation.error}`)
        }
        const repairedEval = await evaluateToPlayable(repairedCode, { autoStart: false })
        if (!repairedEval.ok) {
          throw new Error(`Not playable: ${repairedEval.error}`)
        }
        // Keep UI constraints as the source of truth; do not force-update from model output.
        setTitle(repaired.generation.title || '')
        setCode(repairedCode)
        setShowCode(true)
        addHistory({
          prompt,
          bpm,
          bars,
          style,
          variation,
          status: 'success',
          title: repaired.generation.title,
          code: repairedCode,
        })
        return
      } catch (e) {
        const heuristic = heuristicFixToPlayable(codeToUse)
        if (heuristic.ok) {
          const heuristicValidation = validateStrudelCode(heuristic.code)
          if (heuristicValidation.ok) {
            const heuristicEval = await evaluateToPlayable(heuristic.code, { autoStart: false })
            if (heuristicEval.ok) {
              setTitle(result.title || '')
              setCode(heuristic.code)
              setShowCode(true)
              addHistory({
                prompt,
                bpm,
                bars,
                style,
                variation,
                status: 'success',
                title: result.title,
                code: heuristic.code,
              })
              return
            }
          }
        }
        const message = e instanceof Error ? e.message : 'Repair failed.'
        setError(`Blocked by guardrails: ${validation.error}. Repair failed: ${message}`)
        addHistory({
          prompt,
          bpm,
          bars,
          style,
          variation,
          status: 'error',
          error: `Blocked by guardrails: ${validation.error}`,
        })
        return
      }
    }

    const evalResult = await evaluateToPlayable(codeToUse, { autoStart: false })
    if (!evalResult.ok) {
      try {
        const repaired = await repairStrudel({
          previousOutput: ctx.rawModelOutput,
          error: evalResult.error,
          bpm,
          bars,
          style,
          variation,
        })
        setLastModelOutput(repaired.raw)
        const repairedNormalized = normalizeStrudelCode(repaired.generation.code)
        const repairedCode = repairedNormalized.code
        const repairedValidation = validateStrudelCode(repairedCode)
        if (!repairedValidation.ok) {
          throw new Error(`Blocked by guardrails: ${repairedValidation.error}`)
        }
        const repairedEval = await evaluateToPlayable(repairedCode, { autoStart: false })
        if (!repairedEval.ok) {
          throw new Error(`Not playable: ${repairedEval.error}`)
        }
        // Keep UI constraints as the source of truth; do not force-update from model output.
        setTitle(repaired.generation.title || '')
        setCode(repairedCode)
        setShowCode(true)
        addHistory({
          prompt,
          bpm,
          bars,
          style,
          variation,
          status: 'success',
          title: repaired.generation.title,
          code: repairedCode,
        })
        return
      } catch (e) {
        const heuristic = heuristicFixToPlayable(codeToUse)
        if (heuristic.ok) {
          const heuristicValidation = validateStrudelCode(heuristic.code)
          if (heuristicValidation.ok) {
            const heuristicEval = await evaluateToPlayable(heuristic.code, { autoStart: false })
            if (heuristicEval.ok) {
              setTitle(result.title || '')
              setCode(heuristic.code)
              setShowCode(true)
              addHistory({
                prompt,
                bpm,
                bars,
                style,
                variation,
                status: 'success',
                title: result.title,
                code: heuristic.code,
              })
              return
            }
          }
        }
        const message = e instanceof Error ? e.message : 'Repair failed.'
        setError(`Not playable: ${evalResult.error}. Repair failed: ${message}`)
        addHistory({
          prompt,
          bpm,
          bars,
          style,
          variation,
          status: 'error',
          error: `Not playable: ${evalResult.error}`,
        })
        return
      }
    }

    setTitle(result.title || '')
    setCode(codeToUse)
    setShowCode(true)
    addHistory({
      prompt,
      bpm,
      bars,
      style,
      variation,
      status: 'success',
      title: result.title,
      code: codeToUse,
    })
  }

  function addHistory(item: Omit<HistoryItem, 'id' | 'createdAt'>) {
    const next: HistoryItem = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...item,
    }
    setHistory((prev) => [next, ...prev].slice(0, 20))
  }

  async function handlePlay() {
    setError('')
    void ensureStrudelInitialized()
    const validation = validateStrudelCode(code)
    if (!validation.ok) {
      setError(`Blocked by guardrails: ${validation.error}`)
      return
    }
    try {
      await playCode(code, bpm)
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Playback failed.'
      setError(message)
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // ignore
    }
  }

  async function copyShareLink() {
    if (!shareState) return
    const encoded = encodeShareState(shareState)
    const url = new URL(window.location.href)
    url.searchParams.set('state', encoded)
    await copy(url.toString())
  }

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <div className="title">Strudel Gen (local)</div>
          <div className="subtitle">Prompt → generate Strudel → play → iterate</div>
        </div>
        <div className="headerActions">
          <button className="btn" onClick={() => setShowCode((v) => !v)}>
            {showCode ? 'Hide code' : 'Show code'}
          </button>
        </div>
      </header>

      <main className="main">
        <section className="panel">
          <h2>Describe the music</h2>
          <div className={ollamaStatus.ok ? 'status ok' : 'status err'}>{ollamaStatus.detail}</div>
          <textarea
            className="textarea"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder='Examples: "chill lo-fi beat", "energetic techno loop", "calm ambient pads"'
            rows={4}
          />

          <div className="chips">
            {[
              'chill lo-fi beat',
              'energetic techno loop',
              'hip hop boom bap',
              'calm ambient pads',
              'cinematic tension',
            ].map((t) => (
              <button key={t} className="chip" onClick={() => setPrompt(t)}>
                {t}
              </button>
            ))}
          </div>

          <div className="controls">
            <label className="field">
              <span>Style</span>
              <select value={style} onChange={(e) => setStyle(e.target.value as Style)}>
                {STYLES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Speed (BPM): {bpm}</span>
              <input
                type="range"
                min={60}
                max={160}
                step={1}
                value={bpm}
                onChange={(e) => setBpm(Number(e.target.value))}
              />
            </label>

            <label className="field">
              <span>Length (bars)</span>
              <select value={bars} onChange={(e) => setBars(Number(e.target.value))}>
                {[4, 8, 16].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>

            <div className="field">
              <span>Variation</span>
              <div className="segmented">
                {(['simple', 'balanced', 'busy'] as const).map((v) => (
                  <button
                    key={v}
                    className={v === variation ? 'segBtn active' : 'segBtn'}
                    onClick={() => setVariation(v)}
                    type="button"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="row">
            <button className="btn primary" onClick={handleGenerate} disabled={busy || !ollamaStatus.ok}>
              {busy ? 'Generating…' : 'Generate'}
            </button>
            <button className="btn" onClick={handleGenerate} disabled={busy || !ollamaStatus.ok}>
              Regenerate
            </button>
          </div>

          {error ? <div className="error">{error}</div> : null}
          {lastModelOutput ? (
            <details className="details">
              <summary>Model output (debug)</summary>
              <pre className="pre">{lastModelOutput}</pre>
            </details>
          ) : null}
          {!ollamaStatus.ok ? (
            <div className="hint">
              Start Ollama, then refresh. Typical setup:
              <br />
              1) Install Ollama (Mac): https://ollama.com/download
              <br />
              2) Pull the model: <code>ollama pull qwen3</code>
              <br />
              3) Run: <code>ollama serve</code> (or open the Ollama app)
            </div>
          ) : null}
        </section>

        <section className="panel">
          <h2>Preview</h2>
          <div className="row">
            <button className="btn primary" onClick={handlePlay} disabled={!code.trim()}>
              Play
            </button>
            <button
              className="btn"
              onClick={async () => {
                setError('')
                void ensureStrudelInitialized()
                setCode('note("c3 e3 g3 c4").s("sine").slow(2)')
                setShowCode(true)
                try {
                  await playCode('note("c3 e3 g3 c4").s("sine").slow(2)', bpm)
                } catch (e) {
                  const message = e instanceof Error ? e.message : 'Playback failed.'
                  setError(message)
                }
              }}
            >
              Test sound
            </button>
            <button className="btn" onClick={() => stopPlayback()} disabled={!code.trim()}>
              Stop
            </button>
            <button className="btn" onClick={() => copy(code)} disabled={!code.trim()}>
              Copy code
            </button>
            <button
              className="btn"
              onClick={() =>
                copy(
                  JSON.stringify(
                    { prompt, bpm, bars, style, variation, title: title || undefined },
                    null,
                    2,
                  ),
                )
              }
              disabled={!code.trim()}
            >
              Copy params
            </button>
            <button className="btn" onClick={copyShareLink} disabled={!shareState}>
              Copy share link
            </button>
          </div>

          <div className="meta">
            <div className="metaLine">
              <span className="metaKey">Title</span>
              <span className="metaVal">{title || '—'}</span>
            </div>
            <div className="metaLine">
              <span className="metaKey">Guardrails</span>
              <span className="metaVal">Local-only denylist + size limits</span>
            </div>
          </div>

          {showCode ? (
            <textarea
              className="textarea code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Generated Strudel code will appear here…"
              rows={12}
            />
          ) : (
            <div className="hint">Show code to view/edit the generated Strudel expression.</div>
          )}
        </section>

        <section className="panel history">
          <h2>History</h2>
          <div className="historyActions">
            <button className="btn" onClick={() => setHistory([])} disabled={!history.length}>
              Clear
            </button>
          </div>
          <div className="historyList">
            {history.length ? (
              history.map((h) => (
                <button
                  key={h.id}
                  className={h.status === 'success' ? 'historyItem ok' : 'historyItem err'}
                  onClick={() => {
                    setPrompt(h.prompt)
                    setBpm(h.bpm)
                    setBars(h.bars)
                    setStyle(h.style)
                    setVariation(h.variation)
                    setTitle(h.title || '')
                    setCode(h.code || '')
                    setShowCode(true)
                    setError(h.error || '')
                  }}
                >
                  <div className="historyTop">
                    <span className="historyTitle">{h.title || h.prompt || '(untitled)'}</span>
                    <span className="historyBadge">{h.style}</span>
                  </div>
                  <div className="historyBottom">
                    <span>
                      {h.bpm} BPM · {h.bars} bars · {h.variation}
                    </span>
                    <span>{new Date(h.createdAt).toLocaleString()}</span>
                  </div>
                </button>
              ))
            ) : (
              <div className="hint">No generations yet.</div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
