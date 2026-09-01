import type { ClaudeTurnEvent } from '@/entities/claude-cli'

type Found = { toolUseId: string; agentId: string }

// An isolated teammate leaves its work on a branch named after the runtime's
// own agent id, and the only place that id is ever said is the Agent tool's
// result. The tile is keyed by the tool call, so the two meet here.
export function agentIdIn(turn: ClaudeTurnEvent): Found | null {
  if (turn.type !== 'toolResult') return null
  const agentId = turn.agentId ?? ''
  if (agentId.length === 0) return null
  return { toolUseId: turn.toolUseId, agentId }
}
