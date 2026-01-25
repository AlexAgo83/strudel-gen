const DEFAULT_MAX_CHARS = 8_000
const DEFAULT_MAX_LINES = 20

const denylist = [
  ';',
  '{',
  '}',
  '=',
  '=>',
  'function',
  'class',
  'import',
  'export',
  'require',
  'window',
  'document',
  'navigator',
  'localStorage',
  'sessionStorage',
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'Worker',
  'postMessage',
  'eval',
  'Function',
  'setTimeout',
  'setInterval',
  'while',
  'for (',
  'for(',
  'github:',
  'samples(',
]

const allowedStarts = [
  's(',
  'note(',
  'n(',
  'stack(',
  'cat(',
  'seq(',
  'sometimes(',
  'every(',
  'fast(',
  'slow(',
] as const

export type ValidationResult =
  | { ok: true }
  | { ok: false; error: string }

export function validateStrudelCode(
  rawCode: string,
  opts?: { maxChars?: number; maxLines?: number },
): ValidationResult {
  const code = rawCode.trim()
  if (!code) return { ok: false, error: 'Empty code.' }

  if (code.length < 6) return { ok: false, error: 'Code is too short.' }

  const maxChars = opts?.maxChars ?? DEFAULT_MAX_CHARS
  if (code.length > maxChars) {
    return { ok: false, error: `Code is too long (>${maxChars} chars).` }
  }

  const lineCount = code.split('\n').length
  const maxLines = opts?.maxLines ?? DEFAULT_MAX_LINES
  if (lineCount > maxLines) {
    return { ok: false, error: `Code has too many lines (>${maxLines}).` }
  }

  const lower = code.toLowerCase()
  for (const token of denylist) {
    if (lower.includes(token.toLowerCase())) {
      return { ok: false, error: `Blocked token detected: ${token}` }
    }
  }

  const normalized = code.replaceAll(/\s+/g, '')
  if (!allowedStarts.some((s) => normalized.toLowerCase().startsWith(s))) {
    return {
      ok: false,
      error: `Code must start with one of: ${allowedStarts.join(', ')}`,
    }
  }

  if (normalized.endsWith('(') || normalized.endsWith('.')) {
    return { ok: false, error: 'Code looks incomplete.' }
  }

  if (
    normalized.toLowerCase().startsWith('s(') ||
    normalized.toLowerCase().startsWith('note(') ||
    normalized.toLowerCase().startsWith('n(')
  ) {
    if (!(code.includes('"') || code.includes("'"))) {
      return { ok: false, error: 'Expected a quoted pattern string.' }
    }
  }

  // Basic structural checks (ignore parentheses inside quotes).
  let inSingle = false
  let inDouble = false
  let escape = false
  let parenDepth = 0

  for (const ch of code) {
    if (escape) {
      escape = false
      continue
    }
    if (ch === '\\') {
      escape = true
      continue
    }
    if (!inDouble && ch === "'") inSingle = !inSingle
    else if (!inSingle && ch === '"') inDouble = !inDouble
    else if (!inSingle && !inDouble) {
      if (ch === '(') parenDepth++
      if (ch === ')') parenDepth--
      if (parenDepth < 0) return { ok: false, error: 'Unbalanced parentheses.' }
    }
  }

  if (inSingle || inDouble) return { ok: false, error: 'Unclosed string quote.' }
  if (parenDepth !== 0) return { ok: false, error: 'Unbalanced parentheses.' }

  return { ok: true }
}
