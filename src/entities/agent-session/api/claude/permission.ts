import type { PermissionAlwaysResult, PermissionEvent, PermissionResult } from './permission.types'

import { toolLine, toolTarget } from './shared'

export function permissionResult(allow: boolean, input: unknown): PermissionResult {
  return allow
    ? { behavior: 'allow', updatedInput: input }
    : { behavior: 'deny', message: 'The user denied this tool call' }
}

export function permissionAlwaysResult(toolName: string, input: unknown): PermissionAlwaysResult {
  return {
    behavior: 'allow',
    updatedInput: input,
    updatedPermissions: [
      { type: 'addRules', rules: [{ toolName }], behavior: 'allow', destination: 'session' },
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
