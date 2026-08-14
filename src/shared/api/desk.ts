import type { AgentDef, AgentDefDraft } from '@/entities/agent-def'
import type { RunConfig, Settings } from '@/entities/agent-session'
export type AgentHostEvent =
  | { id: string; kind: 'line'; line: string }
  | { id: string; kind: 'workspace'; cwd: string }
  | { id: string; kind: 'exit'; code: number | null }

export type AuthStatus = {
  loggedIn: boolean
  email?: string
  orgName?: string
  missing?: boolean
}

export type DeskBridge = {
  pickProjectDir(): Promise<string | null>
  restoreProjectDir(): Promise<string | null>
  startAgent(id: string, prompt: string, config: RunConfig): Promise<void>
  readSettings(): Promise<Settings>
  writeSettings(next: Settings): Promise<Settings>
  authStatus(): Promise<AuthStatus>
  listAgentDefs(): Promise<AgentDef[]>
  writeAgentDef(draft: AgentDefDraft): Promise<string>
  login(): Promise<AuthStatus>
  onAuthProgress(listener: (line: string) => void): () => void
  sendToAgent(id: string, text: string): void
  stopAgent(id: string): void
  respondPermission(id: string, requestId: string, result: unknown): void
  onAgentEvent(listener: (event: AgentHostEvent) => void): () => void
  latestCliVersion(): Promise<{
    installed: string | null
    latest: string | null
    managedBy: string | null
  }>
  runCliUpdate(): Promise<{ output: string }>
}

declare global {
  interface Window {
    desk: DeskBridge
  }
}
