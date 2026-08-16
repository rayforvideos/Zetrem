import type { ModelChoice, PermissionMode } from '@/entities/agent-session'
import type { AuthStatus } from '@/entities/auth'
import type { Failure } from '@/shared/lib/failure/failure.types'
import type { FaceId } from '@/entities/user'

export type Account = {
  auth: AuthStatus | null
  error: string | null
  note: string
  signingIn: boolean
  signingOut: boolean
  sessionLive: boolean
  onSignIn(): void
  onSignOut(): void
}

export type Project = {
  chosen: { name: string; path: string } | null
  onChoose(): void
}

export type Defaults = {
  permissionMode: PermissionMode
  model: ModelChoice
  onPermissionMode(mode: PermissionMode): void
  onModel(model: ModelChoice): void
}

export type Plugins = {
  summary: string
  onOpen(): void
}

export type Actions = {
  reopened: boolean
  canStart: boolean
  onStart(): void
  onCancel(): void
  onTour(): void
}

export type You = {
  name: string
  face: FaceId
  onName(next: string): void
  onFace(next: FaceId): void
}

export type SetupPaneProps = {
  account: Account
  you: You
  project: Project
  defaults: Defaults
  plugins: Plugins
  actions: Actions
  notice: Failure | null
}
