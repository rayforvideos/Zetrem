import type { ModelChoice, PermissionMode, EffortChoice } from '@/entities/claude-cli'
import type { AccountBusy, AccountBusyOn, AccountList, AuthStatus } from '@/entities/auth'
import type { Failure } from '@/shared/lib/failure/failure.types'
import type { FaceId } from '@/entities/user'

export type Account = {
  auth: AuthStatus | null
  accounts: AccountList | null
  busy: AccountBusy
  busyOn: AccountBusyOn
  error: string | null
  note: string
  sessionLive: boolean
  installing: boolean
  onAdd(): void
  onSwitch(id: string): void
  onReauth(id: string): void
  onRemove(id: string): void
  onSignOut(): void
  onCancelLogin(): void
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
  effort: EffortChoice
  tongue: 'system' | 'en' | 'ko'
  onTongue(next: 'system' | 'en' | 'ko'): void
  notify: boolean
  onNotify(on: boolean): void
  enterSends: boolean
  onEnterSends(on: boolean): void
  chrome: boolean
  onChrome(on: boolean): void
  passEnv: string[]
  onPassEnv(names: string[]): void
  onPermissionMode(mode: PermissionMode): void
  onModel(model: ModelChoice): void
  onEffort(effort: EffortChoice): void
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

export type SetupTab = 'start' | 'general' | 'session' | 'memory' | 'extensions'

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
