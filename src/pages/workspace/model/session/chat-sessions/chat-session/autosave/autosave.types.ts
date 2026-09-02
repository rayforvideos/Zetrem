import type { AgentStores } from '../../../agent-events/agent-events.types'
import type { ChatMeta, ChatSessionDeps } from '../chat-session.types'

export type AutosaveOwner = {
  chatId: string
  project: string
  stores: AgentStores
  meta: ChatMeta
  thread(): string | null
  deps: ChatSessionDeps
}

export type Autosave = {
  // Writes what is on screen now, settled or not.
  keep(): void
  // Takes what is on screen for already written, so a chat read from disk is
  // not read and rewritten in the same breath.
  markSaved(): void
}
