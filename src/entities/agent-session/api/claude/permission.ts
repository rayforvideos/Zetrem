import { toolLine } from './shared'

export type PermissionEvent = {
  type: 'permission'
  requestId: string
  toolName: string
  line: string
  input: unknown
}

export type PermissionResult =
  | { behavior: 'allow'; updatedInput: unknown }
  | { behavior: 'deny'; message: string }

export function permissionResult(allow: boolean, input: unknown): PermissionResult {
  return allow
    ? { behavior: 'allow', updatedInput: input }
    : { behavior: 'deny', message: 'The user denied this tool call' }
}

export type PermissionAlwaysResult = {
  behavior: 'allow'
  updatedInput: unknown
  updatedPermissions: unknown[]
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
      input: request.input,
    },
  ]
}
