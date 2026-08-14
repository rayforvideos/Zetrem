import type { ResumedAgent } from './resumed.types'

export function resumedAgent(result: string): ResumedAgent | null {
  const parsed = parse(result)
  if (parsed === null) return null
  if (parsed.success !== true) return null
  const id = parsed.resumedAgentId
  if (typeof id !== 'string' || id.length === 0) return null
  return { id, name: nameOf(parsed) ?? id }
}

function parse(result: string): Record<string, unknown> | null {
  const start = result.indexOf('{')
  if (start === -1) return null
  try {
    const value: unknown = JSON.parse(result.slice(start))
    return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null
  } catch {
    return null
  }
}

function nameOf(parsed: Record<string, unknown>): string | null {
  const pin = parsed.pin
  if (typeof pin !== 'object' || pin === null) return null
  const name = (pin as Record<string, unknown>).name
  return typeof name === 'string' && name.length > 0 ? name : null
}
