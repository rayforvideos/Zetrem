import type {
  PermissionAlwaysResult,
  PermissionEvent,
  PermissionResult,
  PermissionRule,
} from './permission.types'

import { t } from '@lingui/core/macro'
import { toolLine, toolPlan, toolTarget } from '../shared/shared'

// What the CLI is told when a tool is refused. It is protocol, so it stays in
// the CLI's language, and it must stay one exact string: the CLI hands it back
// inside the tool result, and the only way to know a refusal is our own is to
// recognise this sentence coming home.
const DENIED = 'The user denied this tool call'

export function permissionResult(allow: boolean, input: unknown): PermissionResult {
  return allow ? { behavior: 'allow', updatedInput: input } : { behavior: 'deny', message: DENIED }
}

// A refusal came back through the CLI and landed on a Korean screen in English.
// Only the sentence Zetrem itself sent is swapped, so nothing a tool genuinely
// printed is rewritten under the reader.
export function saidPlainly(said: string): string {
  return said.includes(DENIED) ? said.replaceAll(DENIED, t`You turned this down.`) : said
}

function alwaysRule(toolName: string, input: unknown): PermissionRule {
  if (
    toolName === 'Bash' &&
    isObject(input) &&
    typeof input.command === 'string' &&
    input.command
  ) {
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
      {
        type: 'addRules',
        rules: [alwaysRule(toolName, input)],
        behavior: 'allow',
        destination: 'session',
      },
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
  const plan = toolPlan(request.input)
  return [
    {
      type: 'permission',
      requestId: event.request_id,
      toolName,
      line: toolLine(toolName, request.input),
      detail: toolTarget(request.input),
      ...(plan === '' ? {} : { plan }),
      input: request.input,
    },
  ]
}
