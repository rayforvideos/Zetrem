import type { PendingSend } from './pending-sends.types'

export function holdSend(held: Map<string, PendingSend[]>, id: string, send: PendingSend): void {
  const queued = held.get(id)
  if (queued) queued.push(send)
  else held.set(id, [send])
}

export function releaseSends(held: Map<string, PendingSend[]>, id: string): PendingSend[] {
  const queued = held.get(id) ?? []
  held.delete(id)
  return queued
}

export function dropSends(held: Map<string, PendingSend[]>, id: string): void {
  held.delete(id)
}
