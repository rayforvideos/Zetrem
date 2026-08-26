// The one place the IPC contract is written down. Each channel names the
// arguments the renderer sends and the value main answers with. The preload
// bridge, the main-process handlers, and the push sites are all typed against
// these maps, so adding or changing a channel here makes the compiler point at
// every side that has not followed.
//
// Types are imported from their exact files, never a barrel: the main process
// reaches these maps too, and a barrel may drag in a module that uses the
// Lingui macro, which main cannot compile.
import type {
  AgentDef,
  AgentDefDraft,
} from '@/entities/agent-def/lib/frontmatter/frontmatter.types'
import type { RunConfig } from '@/entities/agent-session/model/run-config/run-config.types'
import type { Settings } from '@/entities/agent-session/model/settings/settings.types'
import type { Project } from '@/entities/project/model/project'
import type { Outcome } from '@/shared/lib/outcome/outcome.types'
import type { ExitReason } from '@/entities/agent-session/lib/exit-line/exit-line.types'
import type { Attached } from '@/entities/attachment/lib/attachment/attachment.types'
import type { AuthStatus } from '@/entities/auth/model/auth'
import type {
  Connector,
  ConnectorVerb,
} from '@/entities/connector/lib/read-connectors/read-connectors.types'
import type { NewConnector } from '@/entities/connector/lib/new-connector/new-connector.types'
import type {
  ChatSummary,
  Transcript,
} from '@/entities/conversation/lib/transcript/transcript.types'
import type {
  Catalog,
  Marketplace,
  PluginScope,
  PluginVerb,
} from '@/entities/plugin/lib/catalog/catalog.types'

export type AgentHostEvent =
  | { id: string; kind: 'line'; line: string }
  | { id: string; kind: 'workspace'; cwd: string }
  | { id: string; kind: 'exit'; code: number | null; reason: ExitReason | null }

export type CliVersions = {
  installed: string | null
  latest: string | null
  managedBy: string | null
}

// Request and reply: ipcRenderer.invoke on one side, ipcMain.handle on the other.
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
  'usage:kept': () => string | null

  'auth:status': () => AuthStatus
  'auth:login': () => AuthStatus
  'auth:logout': () => Outcome<AuthStatus>

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

  'updater:state': () => string | null
  'updater:restart': () => void
}

// Fire and forget from the renderer: ipcRenderer.send, ipcMain.on.
export type Sends = {
  'agent:send': (id: string, text: string, files?: Attached[]) => void
  'agent:stop': (id: string) => void
  'agent:permission': (id: string, requestId: string, result: unknown) => void
  'nudge:show': (title: string, body: string) => void
}

// Pushed from main to the renderer: webContents.send, ipcRenderer.on.
export type Pushes = {
  'agent:event': AgentHostEvent
  'auth:progress': string
  'updater:ready': string
}

export type InvokeChannel = keyof Invokes
export type SendChannel = keyof Sends
export type PushChannel = keyof Pushes

// What the renderer sees for each kind of channel.
export type Invoke<C extends InvokeChannel> = (
  ...args: Parameters<Invokes[C]>
) => Promise<ReturnType<Invokes[C]>>
export type Send<C extends SendChannel> = (...args: Parameters<Sends[C]>) => void
export type Listen<C extends PushChannel> = (listener: (payload: Pushes[C]) => void) => () => void
