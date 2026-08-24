import type { AgentDef, AgentDefDraft } from '@/entities/agent-def'
import type { RunConfig, Settings } from '@/entities/agent-session'
import type { ChatSummary, Transcript } from '@/entities/conversation'
import type { Connector, ConnectorVerb, NewConnector } from '@/entities/connector'
import type { Catalog, Marketplace, PluginRun, PluginScope, PluginVerb } from '@/entities/plugin'
import type { AuthStatus } from '@/entities/auth'
import type { Attached } from '@/entities/attachment'
import type { ExitReason } from '@/entities/agent-session/lib/exit-line/exit-line.types'
export type AgentHostEvent =
  | { id: string; kind: 'line'; line: string }
  | { id: string; kind: 'workspace'; cwd: string }
  | { id: string; kind: 'exit'; code: number | null; reason: ExitReason | null }

export type DeskBridge = {
  pickProjectDir(): Promise<string | null>
  restoreProjectDir(): Promise<string | null>
  recentProjectDirs(): Promise<string[]>
  chooseProjectDir(path: string): Promise<string | null>
  startAgent(id: string, prompt: string, config: RunConfig, files?: Attached[]): Promise<void>
  appVersion(): Promise<string>
  readSettings(): Promise<Settings>
  writeSettings(next: Settings): Promise<Settings>
  pickKnowledge(): Promise<string[]>
  authoredAgents(): Promise<string[]>
  nudge(title: string, body: string): void
  pickFiles(): Promise<string[]>
  pathForFile(file: File): string
  readFiles(paths: string[]): Promise<Attached[]>
  pluginCatalog(): Promise<Catalog>
  pluginAvailable(): Promise<Catalog>
  marketplaces(): Promise<Marketplace[]>
  pluginAct(verb: PluginVerb, target: string, scope?: PluginScope): Promise<PluginRun>
  listChats(project: string): Promise<ChatSummary[]>
  readTranscript(project: string, id: string): Promise<Transcript | null>
  writeTranscript(project: string, saved: Transcript): Promise<void>
  forgetTranscript(project: string, id: string): Promise<void>
  authStatus(): Promise<AuthStatus>
  listAgentDefs(): Promise<AgentDef[]>
  writeAgentDef(draft: AgentDefDraft): Promise<string>
  removeAgentDef(name: string): Promise<void>
  replaceAgentDef(draft: AgentDefDraft, previousName: string): Promise<string>
  login(): Promise<AuthStatus>
  logout(): Promise<AuthStatus>
  onAuthProgress(listener: (line: string) => void): () => void
  sendToAgent(id: string, text: string, files?: Attached[]): void
  stopAgent(id: string): void
  respondPermission(id: string, requestId: string, result: unknown): void
  onAgentEvent(listener: (event: AgentHostEvent) => void): () => void
  probeSession(config: Omit<RunConfig, 'persona'>): Promise<string | null>
  listConnectors(): Promise<Connector[]>
  connectorAct(verb: ConnectorVerb, target: string): Promise<PluginRun>
  addConnector(draft: NewConnector, taken: string[]): Promise<PluginRun>
  importConnectors(): Promise<PluginRun>
  sessionUsage(): Promise<string | null>
  keptUsage(): Promise<string | null>
  latestCliVersion(): Promise<{
    installed: string | null
    latest: string | null
    managedBy: string | null
  }>
  runCliUpdate(): Promise<{ output: string }>
  installCli(): Promise<{ status: AuthStatus; output: string }>
  updaterState(): Promise<string | null>
  updaterRestart(): Promise<void>
  onUpdaterReady(listener: (version: string) => void): () => void
}

declare global {
  interface Window {
    desk: DeskBridge
  }
}
