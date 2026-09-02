import type { RateLimit } from '@/entities/claude-cli/@x/agent-session'
import { withLimit } from '../limits/limits'
import type { AccountStatusState, UpdateInfo } from '../status-store/status-store.types'

type Listener = () => void

const EMPTY: AccountStatusState = { usage: 'unread', usageAtMs: null, limits: [], update: null }

let state: AccountStatusState = EMPTY
const listeners = new Set<Listener>()

function emit(next: AccountStatusState): void {
  state = next
  for (const listener of listeners) listener()
}

export const accountStatus = {
  get(): AccountStatusState {
    return state
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  applyLimit(limit: RateLimit): void {
    emit({ ...state, limits: withLimit(state.limits, limit) })
  },
  setUpdate(update: UpdateInfo): void {
    emit({ ...state, update })
  },
  usageRead(atMs: number): void {
    emit({ ...state, usage: 'read', usageAtMs: atMs })
  },
  usageUnreadable(): void {
    if (state.usage !== 'unread') return
    emit({ ...state, usage: 'unreadable' })
  },
  // The limits go with the account. When it changes the screen says it does
  // not know yet, rather than holding the last account's numbers up as this
  // account's until a fresh reading lands.
  usageForgotten(): void {
    emit({ ...state, usage: 'unread', usageAtMs: null, limits: [] })
  },
  usageKept(): void {
    emit({ ...state, usage: 'kept' })
  },
  reset(): void {
    emit({ ...EMPTY })
  },
}
