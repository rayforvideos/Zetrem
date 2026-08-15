import type { ClaudeTurnEvent } from './parse.types'

import {
  childCloses,
  childNotified,
  childProgress,
  childSays,
  childStarted,
  childStateKnown,
} from '../child'
import { fromControlCancel, fromControlRequest } from '../permission'
import { fromStatusLine } from '../status/status'
import {
  deniedLine,
  noFallbackLine,
  noticeLine,
  refusalLine,
  shutdownLine,
} from '../aside/aside'
import {
  fromAssistant,
  fromResult,
  fromRetry,
  fromStartupTrouble,
  fromStreamEvent,
  fromToolResult,
} from '../turn'

export { permissionAlwaysResult, permissionResult } from '../permission'

function aside(text: string): ClaudeTurnEvent[] {
  return text.length === 0 ? [] : [{ type: 'notice', text }]
}

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

  return [...fromStatusLine(event, parent), ...turns(event, parent)]
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
      return parent ? [] : fromResult(event)
    case 'stream_event':
      return fromStreamEvent(event)
    case 'control_request':
      return fromControlRequest(event)
    case 'control_cancel_request':
      return fromControlCancel(event)
    case 'system':
      switch (event.subtype) {
        case 'task_notification':
          return childNotified(event)
        case 'task_started':
          return childStarted(event)
        case 'task_progress':
          return childProgress(event)
        case 'task_updated':
          return childStateKnown(event)
        case 'init':
          return parent ? [] : fromStartupTrouble(event)
        case 'api_retry':
          return parent ? [] : fromRetry(event)
        case 'model_refusal_fallback':
          return parent ? [] : aside(refusalLine(event))
        case 'model_refusal_no_fallback':
          return parent ? [] : aside(noFallbackLine(event))
        case 'permission_denied':
          return parent ? [] : aside(deniedLine(event))
        case 'notification':
        case 'informational':
          return parent ? [] : aside(noticeLine(event) ?? '')
        case 'worker_shutting_down':
          return parent ? [] : aside(shutdownLine(event))
        default:
          return []
      }
    default:
      return []
  }
}
