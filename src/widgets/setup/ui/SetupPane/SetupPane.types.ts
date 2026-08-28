import type { ModelChoice, PermissionMode } from '@/entities/claude-cli'
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
  installing: boolean
  onSignIn(): void
  onSignOut(): void
  onInstall(): void
  onRecheck(): void
}

export type Project = {
  chosen: { name: string; path: string } | null
  recent: { id: string; name: string; path: string }[]
  onChoose(): void
  onPickRecent(id: string): void
}

type Defaults = {
  permissionMode: PermissionMode
  model: ModelChoice
  tongue: 'system' | 'en' | 'ko'
  onTongue(next: 'system' | 'en' | 'ko'): void
  notify: boolean
  onNotify(on: boolean): void
  enterSends: boolean
  onEnterSends(on: boolean): void
  onPermissionMode(mode: PermissionMode): void
  onModel(model: ModelChoice): void
}

type Plugins = {
  summary: string
  onOpen(): void
}

type Agents = {
  stock: string[]
  on: string[]
  onChange(name: string, on: boolean): void
}

type Actions = {
  reopened: boolean
  signedIn: boolean
  hasProject: boolean
  onStart(): void
  onCancel(): void
}

type You = {
  name: string
  face: FaceId
  onName(next: string): void
  onFace(next: FaceId): void
}

export type SetupTab = 'start' | 'general' | 'session' | 'extensions'

export type SetupPaneProps = {
  account: Account
  you: You
  project: Project
  defaults: Defaults
  plugins: Plugins
  agents: Agents
  actions: Actions
  notice: Failure | null
}
