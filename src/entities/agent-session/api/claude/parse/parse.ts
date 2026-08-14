import type { ClaudeTurnEvent } from './parse.types'

import { childCloses, childNotified, childSays } from '../child'
import type { ChildTurnEvent } from '../child.types'
import { fromControlRequest } from '../permission'
import type { PermissionEvent } from '../permission.types'
import { fromStatusLine } from '../status/status'
import type { StatusEvent } from '../status/status.types'
import { fromAssistant, fromResult, fromStreamEvent, fromToolResult } from '../turn'
import type { TurnEvent } from '../turn.types'

export { permissionAlwaysResult, permissionResult } from '../permission'

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
  switch (event.type) {
    case 'assistant':
      return parent ? childSays(event, parent, 'assistant') : fromAssistant(event)
    case 'user':
      return parent
        ? childSays(event, parent, 'user')
        : [...childCloses(event), ...fromToolResult(event)]
    case 'result':
      return fromResult(event)
    case 'stream_event':
      return fromStreamEvent(event)
    case 'control_request':
      return fromControlRequest(event)
    case 'system':
      return event.subtype === 'task_notification' ? childNotified(event) : []
    default:
      return []
  }
}
