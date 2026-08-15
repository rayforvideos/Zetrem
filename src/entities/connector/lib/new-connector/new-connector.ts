import type { NewConnector, Refusal } from './new-connector.types'

const NAME_MAX = 64

const ALLOWED = /^[A-Za-z0-9_-]+$/

export function tidyName(raw: string): string {
  return raw.trim()
}

export function refusalOf(draft: NewConnector, taken: string[]): Refusal | null {
  const name = tidyName(draft.name)
  if (name.length === 0) return { field: 'name', why: 'Give it a name' }
  if (name.length > NAME_MAX) return { field: 'name', why: `Keep the name under ${NAME_MAX} characters` }
  if (name.startsWith('-')) return { field: 'name', why: 'A name cannot start with a dash' }
  if (!ALLOWED.test(name)) {
    return { field: 'name', why: 'Letters, numbers, hyphens and underscores only' }
  }
  if (taken.some((held) => held.toLowerCase() === name.toLowerCase())) {
    return { field: 'name', why: 'You already have a connector by that name' }
  }

  const url = draft.url.trim()
  if (url.length === 0) return { field: 'url', why: 'Paste the server address' }
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return { field: 'url', why: 'That is not a web address' }
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { field: 'url', why: 'The address has to be http or https' }
  }
  if (parsed.protocol === 'http:' && parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
    return { field: 'url', why: 'Use https, or http only for a server on this machine' }
  }
  return null
}

export function readyToAdd(draft: NewConnector, taken: string[]): boolean {
  return refusalOf(draft, taken) === null
}
