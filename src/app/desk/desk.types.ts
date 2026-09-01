// Import types from their exact files, never a barrel: main reaches these maps
// too, and a barrel may drag in a module using the Lingui macro, which main cannot compile.
import type {
  AgentDef,
  AgentDefDraft,
} from '@/entities/agent-def/api/frontmatter/frontmatter.types'
import type { RunConfig } from '@/entities/claude-cli/api/run-config/run-config.types'
import type { Settings } from '@/entities/settings/model/settings/settings.types'
import type { Project } from '@/entities/project/model/project'
import type {
  LibraryHit,
  LibraryListing,
  LibraryNote,
  LibraryNoteSummary,
} from '@/entities/library/model/note'
import type { Outcome } from '@/shared/lib/outcome/outcome.types'
import type { ExitReason } from '@/entities/claude-cli/lib/exit-line/exit-line.types'
import type { Attached } from '@/entities/attachment/lib/attachment/attachment.types'
import type { AuthStatus } from '@/entities/auth/model/auth'
import type { AccountList } from '@/entities/auth/model/accounts'
import type {
  Connector,
  ConnectorVerb,
} from '@/entities/connector/api/read-connectors/read-connectors.types'
import type { NewConnector } from '@/entities/connector/lib/new-connector/new-connector.types'
import type {
  ChatSummary,
  Transcript,
} from '@/entities/conversation/model/transcript/transcript.types'
import type {
  Catalog,
  Marketplace,
  PluginScope,
  PluginVerb,
} from '@/entities/plugin/api/catalog/catalog.types'

type AgentHostEvent =
  | { id: string; kind: 'line'; line: string }
  | { id: string; kind: 'workspace'; cwd: string }
  | { id: string; kind: 'exit'; code: number | null; reason: ExitReason | null }

// A usage reading kept on disk, with the account it was taken for: the
// renderer shows it only to that account.
export type KeptUsage = {
  report: string
  who: string | null
}

// Where an isolated teammate's work stands: still on its own branch, or
// already merged into the working tree by the orchestrator.
export type WorktreeDiff = { state: 'branch' | 'merged'; diff: string }

// Dropping takes an unmerged branch away; reverting undoes a merged one with
// a new commit, leaving the history it wrote in place.
export type WorktreeRollback = { state: 'dropped' | 'reverted' }

type CliVersions = {
  installed: string | null
  latest: string | null
  managedBy: string | null
}

export type Invokes = {
  'app:version': () => string

  'project:pick': () => string | null
  'project:restore': () => Project | null
  'project:list': () => Project[]
  'project:create': (path: string) => Project | null
  'project:open': (id: string) => Project | null
  'project:forget': (id: string) => void
  'project:repath': (id: string, path: string) => Project | null

  'agent:start': (id: string, prompt: string, config: RunConfig, files?: Attached[]) => void

  'session:probe': (config: Omit<RunConfig, 'persona'>) => string | null
  'session:usage': () => string | null
  'usage:kept': () => KeptUsage | null

  'auth:status': () => AuthStatus
  'auth:login': () => AuthStatus
  'auth:logout': () => Outcome<AuthStatus>

  'accounts:list': () => AccountList
  'accounts:add': () => Outcome<AccountList>
  'accounts:switch': (id: string) => Outcome<AccountList>
  'accounts:reauth': (id: string) => Outcome<AccountList>
  'accounts:remove': (id: string) => Outcome<AccountList>

  'agents:list': () => AgentDef[]
  'agents:write': (draft: AgentDefDraft) => string
  'agents:remove': (name: string) => void
  'agents:replace': (draft: AgentDefDraft, previousName: string) => string
  'agents:pickKnowledge': () => string[]
  'agents:authored': () => string[]

  'settings:read': () => Settings
  'settings:write': (next: Settings) => Settings

  'files:pick': () => string[]
  'files:admit': (path: string) => void
  'files:read': (paths: string[]) => Attached[]

  'plugins:catalog': () => Catalog
  'plugins:available': () => Catalog
  'plugins:marketplaces': () => Marketplace[]
  'plugins:act': (verb: PluginVerb, target: string, scope?: PluginScope) => Outcome<string>

  'connectors:list': () => Connector[]
  'connectors:act': (verb: ConnectorVerb, target: string) => Outcome<string>
  'connectors:add': (draft: NewConnector, taken: string[]) => Outcome<string>
  'connectors:import': () => Outcome<string>

  'transcript:list': (project: string) => ChatSummary[]
  'transcript:read': (project: string, id: string) => Transcript | null
  'transcript:write': (project: string, saved: Transcript) => void
  'transcript:forget': (project: string, id: string) => void

  'cli:latest': () => CliVersions
  'cli:update': () => { output: string }
  'cli:install': () => { status: AuthStatus; output: string }

  'library:list': () => LibraryListing
  'library:read': (id: string) => LibraryNote | null
  'library:remove': (id: string) => void
  'library:write': (
    id: string,
    body: string,
    patch?: { title?: string; tags?: string[] },
  ) => LibraryNote | null
  'library:create': (folder: string | null, title: string) => LibraryNote | null
  'library:rename': (id: string, title: string) => LibraryNote | null
  'library:file': (text: string) => LibraryNote | null
  'library:search': (query: string) => LibraryHit[]
  'library:backlinks': (id: string) => LibraryNoteSummary[]
  'library:folder-add': (name: string) => LibraryListing
  'library:folder-rename': (name: string, next: string) => LibraryListing
  'library:folder-remove': (name: string) => LibraryListing
  // Whether new sessions in this project get the library as a folder and tools.
  'library:agents': () => boolean
  'library:agents-set': (open: boolean) => boolean

  'worktree:diff': (agentId: string) => Outcome<WorktreeDiff>
  'worktree:rollback': (agentId: string) => Outcome<WorktreeRollback>

  'updater:state': () => string | null
  'updater:restart': () => void
}

export type Sends = {
  'agent:send': (id: string, text: string, files?: Attached[]) => void
  'agent:stop': (id: string) => void
  'agent:permission': (id: string, requestId: string, result: unknown) => void
  // Nothing to answer: the login child is killed and the operation waiting on
  // it takes its own did-not-sign-in path from there.
  'auth:cancel-login': () => void
  'nudge:show': (title: string, body: string) => void
}

export type Pushes = {
  'agent:event': AgentHostEvent
  'auth:progress': string
  'updater:ready': string
  'library:changed': null
}

export type InvokeChannel = keyof Invokes
export type SendChannel = keyof Sends
export type PushChannel = keyof Pushes

export type Invoke<C extends InvokeChannel> = (
  ...args: Parameters<Invokes[C]>
) => Promise<ReturnType<Invokes[C]>>
export type Send<C extends SendChannel> = (...args: Parameters<Sends[C]>) => void
export type Listen<C extends PushChannel> = (listener: (payload: Pushes[C]) => void) => () => void
