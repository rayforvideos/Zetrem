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

export type PermissionAlwaysResult = {
  behavior: 'allow'
  updatedInput: unknown
  updatedPermissions: unknown[]
}
