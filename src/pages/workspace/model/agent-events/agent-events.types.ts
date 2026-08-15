import type { ModelChoice } from '@/entities/agent-session'

export type AgentEventRefs = {
  asks: { requestId: string; toolName: string; line: string; detail: string; input: unknown }[]
  childIds: Set<string>
  sends: Map<string, string>
  onModelRefused(model: ModelChoice): void
}
