export type PermissionEvent =
  | {
      type: 'permission'
      requestId: string
      toolName: string
      line: string
      detail: string
      // Set only by a tool that hands over prose of its own, ExitPlanMode's
      // plan among them, so the card can show it whole.
      plan?: string
      input: unknown
    }
  | { type: 'permissionDropped'; requestId: string }

export type PermissionResult =
  | { behavior: 'allow'; updatedInput: unknown }
  | { behavior: 'deny'; message: string }

// Mirrors the CLI's PermissionRuleValue: ruleContent is what sits inside `Bash(...)`, and is
// omitted for tool-wide rules.
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
