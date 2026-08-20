import type { ExitReason } from '@/entities/agent-session'
import type { AgentEventRefs } from '../agent-events/agent-events.types'

export type SessionClose = {
  reason: ExitReason | null
  stopped: boolean
  asks: AgentEventRefs['asks']
  childIds: Set<string>
}

export type SessionBegin = {
  resumed: boolean
  asks: AgentEventRefs['asks']
  sends: AgentEventRefs['sends']
  childIds: Set<string>
}
