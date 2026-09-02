import type { Attached } from '@/entities/attachment'
import type { ExitReason, ModelChoice, RunConfig } from '@/entities/claude-cli'
import type { ChatSpend, Transcript } from '@/entities/conversation'
import type { AgentStores } from '../../agent-events/agent-events.types'

export type LiveState = 'working' | 'asking' | 'idle'

export type ChatMeta = {
  title: string | null
  folder: string
  spend: ChatSpend | null
  resumeId: string | null
}

// What a run is configured with, minus the two the session fills in itself:
// the persona is the orchestrator's own, and the thread is whatever this chat
// has to pick back up.
export type ChatRunConfig = Omit<RunConfig, 'persona' | 'resume'>

// The slice of window.desk a session touches, so tests hand in a fake.
export type ChatSessionDeps = {
  startAgent(id: string, prompt: string, config: RunConfig, files: Attached[]): Promise<unknown>
  sendToAgent(id: string, text: string, files: Attached[]): void
  stopAgent(id: string): void
  respondPermission(id: string, requestId: string, result: unknown): void
  writeTranscript(project: string, packed: Transcript): Promise<unknown>
  onSaveTrouble(cause: unknown): void
}

export type AgentEvent =
  | { id: string; kind: 'line'; line: string }
  | { id: string; kind: 'exit'; code: number | null; reason: ExitReason | null }
  | { id: string; kind: 'workspace'; cwd: string }

export type ChatSession = {
  chatId: string
  project: string
  stores: AgentStores
  meta: ChatMeta
  running(): boolean
  owns(hostId: string): boolean
  live(): LiveState
  configure(config: ChatRunConfig, onModelRefused: (model: ModelChoice) => void): void
  restore(saved: Transcript): void
  send(text: string, to: string | null, files: Attached[]): void
  decide(allow: boolean, always?: boolean): void
  stop(): void
  restart(): void
  reset(): void
  handle(event: AgentEvent): void
  thread(): string | null
  keep(): void
  subscribe(listener: () => void): () => void
}
