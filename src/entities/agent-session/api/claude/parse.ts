import { childCloses, childNotified, childSays } from './child'
import type { ChildTurnEvent } from './child'
import { fromControlRequest } from './permission'
import type { PermissionEvent } from './permission'
import { fromStatusLine } from './status'
import type { StatusEvent } from './status'
import { fromAssistant, fromResult, fromStreamEvent, fromToolResult } from './turn'
import type { TurnEvent } from './turn'

export type { PermissionAlwaysResult, PermissionResult } from './permission'
export { permissionAlwaysResult, permissionResult } from './permission'

export type ClaudeTurnEvent = TurnEvent | ChildTurnEvent | PermissionEvent | StatusEvent

export function parseClaudeLine(line: string): ClaudeTurnEvent[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(line)
  } catch {
    return []
  }
  if (typeof parsed !== 'object' || parsed === null) return []
  const event = parsed as Record<string, unknown>
  const parent = typeof event.parent_tool_use_id === 'string' ? event.parent_tool_use_id : null

  return [...fromStatusLine(event), ...turns(event, parent)]
}

function turns(event: Record<string, unknown>, parent: string | null): ClaudeTurnEvent[] {
  if (event.type === 'assistant') {
    return parent ? childSays(event, parent, 'assistant') : fromAssistant(event)
  }
  if (event.type === 'user') {
    return parent ? childSays(event, parent, 'user') : [...childCloses(event), ...fromToolResult(event)]
  }
  if (event.type === 'result') return fromResult(event)
  if (event.type === 'stream_event') return fromStreamEvent(event)
  if (event.type === 'control_request') return fromControlRequest(event)
  if (event.type === 'system' && event.subtype === 'task_notification') return childNotified(event)
  return []
}
