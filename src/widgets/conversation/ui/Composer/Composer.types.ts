import type { ModelChoice, PermissionMode } from '@/entities/agent-session'
import type { Attached } from '@/entities/attachment'

export type ComposerProps = {
  empty: boolean
  busy: boolean
  sessionLive: boolean
  addressee: string | null
  permissionMode: PermissionMode
  model: ModelChoice
  refusedModels: ModelChoice[]
  files: Attached[]
  onSend(text: string): void
  onPick(): void
  onTake(files: File[]): void
  onDropFile(path: string): void
  onStop(): void
  onClearAddressee(): void
  onPermissionMode(mode: PermissionMode): void
  onModel(model: ModelChoice): void
}
