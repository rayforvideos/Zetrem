import type { ChatStatus, SessionStore } from '@/entities/agent-session'
import type { ModelChoice, RateLimit } from '@/entities/claude-cli'
import type { Conversation } from '../../chat/conversation/conversation.types'
import type { CrewLog } from './crew-log/crew-log.types'

type Sent = { to: string; message: string }

export type AgentStores = {
  conversation: Conversation
  status: ChatStatus
  children: SessionStore
}

export type AgentEventRefs = {
  stores: AgentStores
  asks: {
    requestId: string
    toolName: string
    line: string
    detail: string
    plan?: string
    input: unknown
  }[]
  childIds: Set<string>
  sends: Map<string, Sent>
  // Per limit kind, the state of it the chat was last told about.
  limits: Map<string, string>
  // Task id → the child session that backgrounded the shell (was module state in crew-bash).
  ownedBash: Map<string, string>
  // toolUseId → taskId announced before the child opened (was module state in crew).
  pendingTasks: Map<string, string>
  // Children whose done notice arrived while a shell of theirs still ran: the
  // tile was kept working for the shell, and is parked when the shell ends.
  heldReports: Set<string>
  // Every decision the crew rules took about a tile, in memory, for as long as
  // the chat lives. A tile that stayed working after the work was done is then
  // a paste rather than a guess.
  crewLog: CrewLog
  onModelRefused(model: ModelChoice): void
  onLimit(limit: RateLimit): void
}
