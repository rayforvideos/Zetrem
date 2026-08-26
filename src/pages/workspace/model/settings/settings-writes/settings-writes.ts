import type { Settings } from '@/entities/settings'
import type { Held, Landed } from './settings-writes.types'

export function onUpdate(
  held: Settings,
  patch: Partial<Settings>,
  read: boolean,
  waiting: Partial<Settings>,
): Held {
  const next = { ...held, ...patch }
  if (read) return { next, save: true, waiting }
  return { next, save: false, waiting: { ...waiting, ...patch } }
}

export function onRead(saved: Settings, waiting: Partial<Settings>): Landed {
  const kept = Object.keys(waiting).length > 0
  return { next: { ...saved, ...waiting }, save: kept }
}
