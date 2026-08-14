export type AgentEventRefs = {
  asks: { requestId: string; toolName: string; input: unknown }[]
  childIds: Set<string>
}
