export type PermissionEvent =
  | {
      type: 'permission'
      requestId: string
      toolName: string
      line: string
      detail: string
      input: unknown
    }
  | { type: 'permissionDropped'; requestId: string }

export type PermissionResult =
  | { behavior: 'allow'; updatedInput: unknown }
  | { behavior: 'deny'; message: string }

// mirrors the CLI's PermissionRuleValue: toolName is required, ruleContent narrows
// the rule to what sits inside `Bash(...)` and is omitted for tool-wide rules
export type PermissionRule = {
  toolName: string
  ruleContent?: string
}

export type PermissionAlwaysResult = {
  behavior: 'allow'
  updatedInput: unknown
  updatedPermissions: [
    { type: 'addRules'; rules: PermissionRule[]; behavior: 'allow'; destination: 'session' },
  ]
}
