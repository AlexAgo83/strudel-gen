export type ShareStateV1 = {
  v: 1
  prompt: string
  bpm: number
  bars: number
  style: string
  variation: 'simple' | 'balanced' | 'busy'
  code: string
  title?: string
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

function base64UrlToBytes(base64Url: string): Uint8Array {
  const base64 = base64Url.replaceAll('-', '+').replaceAll('_', '/')
  const padded = base64 + '==='.slice((base64.length + 3) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export function encodeShareState(state: ShareStateV1): string {
  const json = JSON.stringify(state)
  const bytes = new TextEncoder().encode(json)
  return bytesToBase64Url(bytes)
}

export function decodeShareState(encoded: string): ShareStateV1 {
  const bytes = base64UrlToBytes(encoded)
  const json = new TextDecoder().decode(bytes)
  return JSON.parse(json) as ShareStateV1
}

