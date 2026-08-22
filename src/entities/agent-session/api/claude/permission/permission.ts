import type {
  PermissionAlwaysResult,
  PermissionEvent,
  PermissionResult,
  PermissionRule,
} from './permission.types'

import { toolLine, toolTarget } from '../shared/shared'

export function permissionResult(allow: boolean, input: unknown): PermissionResult {
  return allow
    ? { behavior: 'allow', updatedInput: input }
    : { behavior: 'deny', message: 'The user denied this tool call' }
}

// "Don't ask again" must grant only what the dialog showed. For Bash that is the
// one command in front of the user, not every Bash call for the rest of the session.
function alwaysRule(toolName: string, input: unknown): PermissionRule {
  if (toolName === 'Bash' && isObject(input) && typeof input.command === 'string' && input.command) {
    return { toolName: 'Bash', ruleContent: input.command }
  }
  return { toolName }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function permissionAlwaysResult(toolName: string, input: unknown): PermissionAlwaysResult {
  return {
    behavior: 'allow',
    updatedInput: input,
    updatedPermissions: [
      { type: 'addRules', rules: [alwaysRule(toolName, input)], behavior: 'allow', destination: 'session' },
    ],
  }
}

export function fromControlCancel(event: Record<string, unknown>): PermissionEvent[] {
  if (typeof event.request_id !== 'string') return []
  return [{ type: 'permissionDropped', requestId: event.request_id }]
}

export function fromControlRequest(event: Record<string, unknown>): PermissionEvent[] {
  const request = event.request as Record<string, unknown> | undefined
  if (request?.subtype !== 'can_use_tool') return []
  if (typeof event.request_id !== 'string') return []
  const toolName = typeof request.tool_name === 'string' ? request.tool_name : 'tool'
  return [
    {
      type: 'permission',
      requestId: event.request_id,
      toolName,
      line: toolLine(toolName, request.input),
      detail: toolTarget(request.input),
      input: request.input,
    },
  ]
}
