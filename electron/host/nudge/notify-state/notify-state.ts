import { createRequire } from 'node:module'
import type { NotifyState } from '@/entities/settings/model/notify/notify'

// macOS answers UNUserNotificationCenter only from inside the asking app, and
// Electron passes no such question through, so a native module asks. It is a
// mac-only optional dependency: everywhere it is missing the answer is that
// nothing has been decided, which lets the switch work as before.
type Permissions = { getAuthStatus(kind: string): string }

const need = createRequire(import.meta.url)

function permissions(): Permissions | null {
  if (process.platform !== 'darwin') return null
  try {
    return need('node-mac-permissions') as Permissions
  } catch {
    return null
  }
}

export function stateOf(status: string): NotifyState {
  if (status === 'denied' || status === 'restricted') return 'denied'
  if (status === 'not determined') return 'unasked'
  return 'allowed'
}

export function notifyState(): NotifyState {
  const asked = permissions()
  if (asked === null) return 'unasked'
  try {
    return stateOf(asked.getAuthStatus('notifications'))
  } catch {
    return 'unasked'
  }
}
