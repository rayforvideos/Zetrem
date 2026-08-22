import type { ModelChoice } from '@/entities/agent-session'

export type Sent = { to: string; message: string }

export type AgentEventRefs = {
  asks: { requestId: string; toolName: string; line: string; detail: string; input: unknown }[]
  childIds: Set<string>
  sends: Map<string, Sent>
  onModelRefused(model: ModelChoice): void
}
