import { statusStore } from '@/entities/agent-session'

let changes = 0
const listeners = new Set<() => void>()

// How many times the account has moved since the app opened. A hook that
// derives anything from the signed-in account watches this number, so a
// switch invalidates its work the way a project change already does.
export function accountChanges(): number {
  return changes
}

export function subscribeAccountChange(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

// A successful account mutation is one event, not eight. What is on screen
// now was worked out for the account that has just gone, so it goes with it,
// and everything watching the count asks again.
export function accountChanged(): void {
  changes += 1
  statusStore.forgetSession()
  // The limits merge by kind and would otherwise sit there until a reading
  // of the same kind replaced them, so a kind the last account had lingers as
  // this account's. The bar says it is reading instead.
  statusStore.usageForgotten()
  for (const listener of listeners) listener()
}
