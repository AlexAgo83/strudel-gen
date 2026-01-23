export type NormalizeResult = {
  code: string
  changed: boolean
  notes: string[]
}

function collapseWhitespace(code: string): string {
  return code.trim().replaceAll(/\s+/g, ' ')
}

function normalizeNoteArgs(code: string): { code: string; changed: boolean } {
  let changed = false
  let out = code

  // note(c, f, a, e) -> note("c f a e")
  out = out.replaceAll(/note\(\s*([^)"]+?)\s*\)/gi, (m, inner) => {
    // Skip already-quoted
    if (inner.includes('"') || inner.includes("'")) return m

    const tokens = String(inner)
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

    if (!tokens.length) return m
    changed = true
    return `note("${tokens.join(' ')}")`
  })

  // note('c', 'f', 'a', 'e') OR note("c", "f") -> note("c f a e")
  out = out.replaceAll(/note\(\s*([^)]+?)\s*\)/gi, (m, inner) => {
    // Only attempt if it looks like comma-separated quoted tokens
    if (!String(inner).includes(',')) return m

    const tokens = String(inner)
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => t.replaceAll(/^['"]|['"]$/g, '').trim())
      .filter((t) => t.length > 0 && !/^-?\d+(\.\d+)?$/.test(t))

    if (!tokens.length) return m
    changed = true
    return `note("${tokens.join(' ')}")`
  })

  // n(0, 2, 4) -> n("0 2 4")
  out = out.replaceAll(/n\(\s*([^)"]+?)\s*\)/gi, (m, inner) => {
    if (inner.includes('"') || inner.includes("'")) return m

    const tokens = String(inner)
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

    if (!tokens.length) return m
    changed = true
    return `n("${tokens.join(' ')}")`
  })

  // n('0', '2', '4') OR n("0", "2") -> n("0 2 4")
  out = out.replaceAll(/n\(\s*([^)]+?)\s*\)/gi, (m, inner) => {
    if (!String(inner).includes(',')) return m

    const tokens = String(inner)
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => t.replaceAll(/^['"]|['"]$/g, '').trim())
      .filter((t) => t.length > 0 && !/^-?\d+(\.\d+)?$/.test(t))

    if (!tokens.length) return m
    changed = true
    return `n("${tokens.join(' ')}")`
  })

  return { code: out, changed }
}

function normalizeMistakenStack(code: string): { code: string; changed: boolean } {
  let changed = false
  let out = code

  // Some small models confuse s(...) with stack(...) when used with note(...)
  out = out.replaceAll(/\bs\(\s*(note\(|stack\(|cat\(|seq\(|n\()/gi, (_m, inner) => {
    changed = true
    return `stack(${inner}`
  })

  return { code: out, changed }
}

function rewriteMethodToFunction(
  code: string,
  opts: { method: string; fn: string },
): { code: string; changed: boolean } {
  const needle = `.${opts.method}(`
  const idx = code.indexOf(needle)
  if (idx === -1) return { code, changed: false }

  const left = code.slice(0, idx).trim()
  if (!left) return { code, changed: false }

  const argsStart = idx + needle.length
  let i = argsStart
  let inSingle = false
  let inDouble = false
  let escape = false
  let depth = 1

  for (; i < code.length; i++) {
    const ch = code[i]!
    if (escape) {
      escape = false
      continue
    }
    if (ch === '\\') {
      escape = true
      continue
    }
    if (!inDouble && ch === "'") {
      inSingle = !inSingle
      continue
    }
    if (!inSingle && ch === '"') {
      inDouble = !inDouble
      continue
    }
    if (inSingle || inDouble) continue

    if (ch === '(') depth++
    else if (ch === ')') depth--

    if (depth === 0) break
  }

  if (depth !== 0) return { code, changed: false }

  const args = code.slice(argsStart, i).trim()
  const suffix = code.slice(i + 1)

  const combinedArgs = args ? `${left}, ${args}` : left
  return { code: `${opts.fn}(${combinedArgs})${suffix}`, changed: true }
}

function ensureSynthForNoteLike(code: string): { code: string; changed: boolean } {
  const normalized = code.replaceAll(/\s+/g, '')
  if (
    !normalized.toLowerCase().startsWith('note(') &&
    !normalized.toLowerCase().startsWith('stack(note(') &&
    !normalized.toLowerCase().startsWith('cat(note(') &&
    !normalized.toLowerCase().startsWith('seq(note(')
  ) {
    return { code, changed: false }
  }

  // If the code already selects a synth/sound, keep it.
  if (/\.\s*s\s*\(/i.test(code) || /\.\s*sound\s*\(/i.test(code)) {
    return { code, changed: false }
  }

  // Add a default synth to make it reliably audible.
  return { code: `${code}.s("sine")`, changed: true }
}

export function normalizeStrudelCode(raw: string): NormalizeResult {
  const notes: string[] = []
  let code = raw
  let changed = false

  const collapsed = collapseWhitespace(code)
  if (collapsed !== code) {
    code = collapsed
    changed = true
    notes.push('Collapsed whitespace')
  }

  const stackMethod = rewriteMethodToFunction(code, { method: 'stack', fn: 'stack' })
  if (stackMethod.changed) {
    code = stackMethod.code
    changed = true
    notes.push('Rewrote .stack(...) as stack(...)')
  }

  const noteNorm = normalizeNoteArgs(code)
  if (noteNorm.changed) {
    code = noteNorm.code
    changed = true
    notes.push('Normalized note()/n() arguments to quoted mini-notation')
  }

  const stackNorm = normalizeMistakenStack(code)
  if (stackNorm.changed) {
    code = stackNorm.code
    changed = true
    notes.push('Replaced mistaken s(...) with stack(...)')
  }

  const synthNorm = ensureSynthForNoteLike(code)
  if (synthNorm.changed) {
    code = synthNorm.code
    changed = true
    notes.push('Added default synth (.s("sine"))')
  }

  return { code, changed, notes }
}
