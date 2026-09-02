import type { AgentEventRefs } from '../agent-events.types'

import type { Addressed } from './addressee.types'

export function whose(event: Addressed, refs: AgentEventRefs): string | null {
  if (event.toolUseId !== null && refs.childIds.has(event.toolUseId)) return event.toolUseId
  const byTask = refs.stores.children.findByTask(event.taskId)
  if (byTask !== null && refs.childIds.has(byTask.id)) return byTask.id
  return null
}

export function addressee(input: unknown): string {
  if (typeof input !== 'object' || input === null) return ''
  const held = input as Record<string, unknown>
  const to = held.to ?? held.agent ?? held.name
  return typeof to === 'string' ? bareName(to) : ''
}

function bareName(to: string): string {
  return to.replace(/\s*\[[^\]]*\]\s*$/, '').trim()
}
