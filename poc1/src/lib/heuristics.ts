import { normalizeStrudelCode } from './normalize'

export type HeuristicFix =
  | { ok: true; code: string; notes: string[] }
  | { ok: false; reason: string }

const synths = ['sine', 'sawtooth', 'triangle', 'square'] as const

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr))
}

function extractNoteMiniNotation(code: string): string[] {
  const normalized = normalizeStrudelCode(code).code

  const matches = Array.from(normalized.matchAll(/note\(\s*"([^"]+)"\s*\)/gi)).map((m) =>
    (m[1] ?? '').trim(),
  )

  return uniq(matches).filter(Boolean)
}

export function heuristicFixToPlayable(rawCode: string): HeuristicFix {
  const notes = extractNoteMiniNotation(rawCode)
  if (!notes.length) return { ok: false, reason: 'No note("...") patterns found.' }

  const parts = notes.slice(0, 3).map((n, idx) => {
    const synth = synths[idx % synths.length]
    return `note("${n}").s("${synth}")`
  })

  const code =
    parts.length === 1 ? `${parts[0]}.slow(2)` : `stack(${parts.join(', ')}).slow(2)`

  return { ok: true, code, notes: ['Heuristic rebuild: extracted note patterns and stacked them.'] }
}

