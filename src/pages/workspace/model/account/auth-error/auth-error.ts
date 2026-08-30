import type { Refresh } from './auth-error.types'

// An operation says what became of it and reads the list again in the same
// tick, so a refresh that cleared the message would wipe it before anyone
// saw it. Only the user asking to check again clears what is on screen.
export function errorAfterRefresh(shown: string | null, refresh: Refresh): string | null {
  return refresh === 'asked' ? null : shown
}
