import type { AgentStores } from '../../../agent-events/agent-events.types'
import type { ChatMeta, ChatSessionDeps } from '../chat-session.types'

export type AutosaveOwner = {
  chatId: string
  project: string
  stores: AgentStores
  meta: ChatMeta
  thread(): string | null
  deps: ChatSessionDeps
  // Told after every write that lands, so the registry can refresh the chat
  // list and let go of a session whose last save is on disk.
  onSaved(): void
}

export type Autosave = {
  // Writes what is on screen now, settled or not.
  keep(): void
  // Takes what is on screen for already written, so a chat read from disk is
  // not read and rewritten in the same breath.
  markSaved(): void
  // Lets the stores go and cancels the write that was queued but not yet run,
  // so a chat the person removed cannot be written back after it is gone.
  dispose(): void
}
