import type { Attempt } from './relaunch.types'

export function shouldRelaunch(attempt: Attempt | null, code: number | null): boolean {
  if (attempt === null) return false
  return attempt.resumed && !attempt.spoke && code !== 0
}
