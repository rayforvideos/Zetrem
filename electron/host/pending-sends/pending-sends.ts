import type { PendingSend } from './pending-sends.types'

// A message typed while an agent is still starting is already drawn as sent in
// the renderer, so it has to wait for the child rather than be dropped.
export function holdSend(held: Map<string, PendingSend[]>, id: string, send: PendingSend): void {
  const queued = held.get(id)
  if (queued) queued.push(send)
  else held.set(id, [send])
}

// Order matters: the agent has to read the waiting messages in the order they
// were typed, and each one may only be handed over once.
export function releaseSends(held: Map<string, PendingSend[]>, id: string): PendingSend[] {
  const queued = held.get(id) ?? []
  held.delete(id)
  return queued
}

export function dropSends(held: Map<string, PendingSend[]>, id: string): void {
  held.delete(id)
}
