import type { EffortChoice, ModelChoice, PermissionMode } from '@/entities/claude-cli'
import type { Attached } from '@/entities/attachment'

export type ComposerProps = {
  empty: boolean
  busy: boolean
  sessionLive: boolean
  addressee: string | null
  permissionMode: PermissionMode
  model: ModelChoice
  effort: EffortChoice
  // What the running session is actually on, as it reported itself. Null where
  // nothing is running, or where the session said nothing this app recognises.
  runningPermissionMode: PermissionMode | null
  runningModel: ModelChoice | null
  refusedModels: ModelChoice[]
  enterSends: boolean
  // Whether sessions in this project are handed the library to search.
  library: boolean
  files: Attached[]
  onSend(text: string): void
  onPick(): void
  onTake(files: File[]): void
  onDropFile(path: string): void
  onStop(): void
  onClearAddressee(): void
  onPermissionMode(mode: PermissionMode): void
  onModel(model: ModelChoice): void
  onEffort(effort: EffortChoice): void
  onLibrary(open: boolean): void
  // Replaces the running session with one started on what is picked now.
  onRestart(): void
}
