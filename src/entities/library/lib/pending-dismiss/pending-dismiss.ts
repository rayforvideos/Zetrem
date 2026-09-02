import type { PendingDismiss } from './pending-dismiss.types'

// A dismiss hides a proposal at once but waits before it asks main to delete
// it, so a person who clicks Dismiss by mistake has a few seconds to say
// Undo. Each id keeps a token: hiding it again — a second dismiss before the
// first ever expired — moves the token forward, so the timer that fires
// first finds itself stale and does nothing. The delete happens exactly
// once, timed by whichever hide was last.
export function pendingDismiss(): PendingDismiss {
  return new Map()
}

// Starts (or restarts) the wait for one id. The token it returns is the
// caller's receipt: hand it back to `expire` when the wait is over.
export function begin(state: PendingDismiss, id: string): number {
  const token = (state.get(id) ?? 0) + 1
  state.set(id, token)
  return token
}

// Whether an id is still hidden, waiting on its timer.
export function isPending(state: PendingDismiss, id: string): boolean {
  return state.has(id)
}

// Undo: true when there was a wait to cancel, false when the delete already
// ran (or nothing was ever hidden) — nothing left for Undo to do.
export function cancel(state: PendingDismiss, id: string): boolean {
  return state.delete(id)
}

// The timer firing: true when this is still the wait that started it, so the
// caller should go ahead and delete. False when it was undone, or a later
// hide moved the token past this one — that hide owns the delete now.
export function expire(state: PendingDismiss, id: string, token: number): boolean {
  if (state.get(id) !== token) return false
  state.delete(id)
  return true
}
