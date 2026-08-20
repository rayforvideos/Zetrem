import type { AgentSession } from '@/entities/agent-session'
import { personaOf } from '@/entities/agent-session'
import { targetOf, verbOf } from '@/shared/lib/tool-verb/tool-verb'
import { currentCall, shapeOfCall } from '../now/now'
import { stateWord } from '../../ui/layers/StateChip/StateChip'
import type { Lane } from './lane.types'

export function laneOf(session: AgentSession, nowMs: number): Lane {
  const kind = session.subagentType || session.label
  const call = session.status === 'working' ? currentCall(session.stream) : null
  const shape = call === null ? null : shapeOfCall(call.line)
  const said = (session.doing ?? '').trim()
  return {
    id: session.id,
    name: personaOf(kind).name,
    subagentType: kind,
    verb: shape === null ? (session.status === 'working' ? said || stateWord('working') : stateWord(session.status)) : verbOf(shape),
    target: shape === null ? '' : targetOf(shape),
    shape,
    outMs: Math.max(0, (session.endedAtMs ?? nowMs) - session.startedAtMs),
    live: session.status === 'working',
    needsYou: session.status === 'waiting',
  }
}
