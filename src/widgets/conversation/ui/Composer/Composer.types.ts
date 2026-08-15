import type { ModelChoice, PermissionMode } from '@/entities/agent-session'

export type ComposerProps = {
  empty: boolean
  busy: boolean
  sessionLive: boolean
  addressee: string | null
  permissionMode: PermissionMode
  model: ModelChoice
  onSend(text: string): void
  onStop(): void
  onClearAddressee(): void
  onPermissionMode(mode: PermissionMode): void
  onModel(model: ModelChoice): void
}
