import type { HintId } from './hints.types'

export function hintDue(id: HintId, seen: string[], when: boolean): boolean {
  return when && !seen.includes(id)
}

export function hintSeen(id: HintId, seen: string[]): string[] {
  return seen.includes(id) ? seen : [...seen, id]
}
