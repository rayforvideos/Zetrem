export type AgentEventRefs = {
  asks: { requestId: string; toolName: string; line: string; input: unknown }[]
  childIds: Set<string>
  sends: Map<string, string>
}
