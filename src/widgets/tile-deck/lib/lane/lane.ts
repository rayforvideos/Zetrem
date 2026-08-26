import type { AgentSession } from '@/entities/agent-session'
import { personaOf } from '@/entities/teammate'
import { targetOf, verbOf } from '@/entities/tool'
import type { ToolShape } from '@/entities/tool'
import { currentCall, shapeOfCall } from '../now/now'
import { stateWord } from '../state-word/state-word'
import type { Lane } from './lane.types'

function verbFor(session: AgentSession, shape: ToolShape | null, said: string): string {
  if (shape !== null) return verbOf(shape)
  if (session.status === 'working') return said || stateWord('working')
  return stateWord(session.status)
}

export function laneOf(session: AgentSession, nowMs: number): Lane {
  const kind = session.subagentType || session.label
  const call = session.status === 'working' ? currentCall(session.stream) : null
  const shape = call === null ? null : shapeOfCall(call.line)
  const said = (session.doing ?? '').trim()
  return {
    id: session.id,
    name: personaOf(kind).name,
    subagentType: kind,
    verb: verbFor(session, shape, said),
    target: shape === null ? '' : targetOf(shape),
    shape,
    outMs: Math.max(0, (session.endedAtMs ?? nowMs) - session.startedAtMs),
    live: session.status === 'working',
    needsYou: session.status === 'waiting',
  }
}
