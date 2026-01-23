import { evaluate, hush, initStrudel } from '@strudel/web'

let replPromise: Promise<unknown> | null = null

export function ensureStrudelInitialized(): Promise<unknown> {
  if (replPromise) return replPromise
  replPromise = initStrudel()
  return replPromise
}

export function stopPlayback(): void {
  try {
    hush()
  } catch {
    // ignore
  }
}

export type EvaluateResult =
  | { ok: true }
  | { ok: false; error: string }

export async function evaluateToPlayable(
  code: string,
  opts?: { autoStart?: boolean },
): Promise<EvaluateResult> {
  try {
    await ensureStrudelInitialized()
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to initialize Strudel.'
    return { ok: false, error: message }
  }

  try {
    // Note: @strudel/web exported evaluate(...) always hushes previous code; keep it for a clean proto.
    const res = await evaluate(code, opts?.autoStart ?? false)
    if (!res) return { ok: false, error: 'Evaluation failed (see console for details).' }
    return { ok: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Strudel evaluation failed.'
    return { ok: false, error: message }
  }
}

export async function playCode(code: string, bpm?: number): Promise<void> {
  const repl = await ensureStrudelInitialized().catch(() => null)
  stopPlayback()

  if (typeof bpm === 'number' && Number.isFinite(bpm) && bpm > 0) {
    const cps = bpm / 60
    try {
      // Prefer setting CPS via repl if available (avoid evaluate("setcps(...)") which can replace the pattern).
      const obj = repl as { setcps?: (c: number) => unknown; setCps?: (c: number) => unknown } | null
      if (obj?.setcps) obj.setcps(cps)
      else if (obj?.setCps) obj.setCps(cps)
    } catch {
      // ignore if setcps is not available
    }
  }

  const evaluation = await evaluateToPlayable(code, { autoStart: true })
  if (!evaluation.ok) throw new Error(`Strudel: ${evaluation.error}`)
}
