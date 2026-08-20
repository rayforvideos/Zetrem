import type { NewConnector, Refusal } from './new-connector.types'

export const NAME_MAX = 64

const ALLOWED = /^[A-Za-z0-9_-]+$/

export function tidyName(raw: string): string {
  return raw.trim()
}

// Reasons come back as codes. Turning them into sentences is the screen's job.
// This also runs in the main process, where the translation macro cannot go.
export function refusalOf(draft: NewConnector, taken: string[]): Refusal | null {
  const name = tidyName(draft.name)
  if (name.length === 0) return { field: 'name', code: 'name-empty' }
  if (name.length > NAME_MAX) return { field: 'name', code: 'name-long' }
  if (name.startsWith('-')) return { field: 'name', code: 'name-dash' }
  if (!ALLOWED.test(name)) return { field: 'name', code: 'name-chars' }
  if (taken.some((held) => held.toLowerCase() === name.toLowerCase())) {
    return { field: 'name', code: 'name-taken' }
  }

  const url = draft.url.trim()
  if (url.length === 0) return { field: 'url', code: 'url-empty' }
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return { field: 'url', code: 'url-shape' }
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { field: 'url', code: 'url-scheme' }
  }
  if (parsed.protocol === 'http:' && parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
    return { field: 'url', code: 'url-insecure' }
  }
  return null
}
