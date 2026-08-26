import type { AgentSession } from '@/entities/agent-session'
import { AgentSprite } from '@/entities/teammate'
import { ToolIcon } from '@/entities/tool'
import { reachOf } from '@/shared/lib/reach/reach'
import { formatClock } from '@/shared/lib/units/units'
import { Button } from '@/shared/ui/button'
import { laneOf } from '../../lib/lane/lane'
import { CallLog } from '../layers/CallLog/CallLog'
import { Transcript } from '../layers/Transcript/Transcript'
import {
  laneClockStyle,
  laneFaceStyle,
  laneIconStyle,
  laneNameStyle,
  laneOpenStyle,
  laneReachStyle,
  laneRoom,
  laneStyle,
  laneTargetStyle,
  laneVerbStyle,
} from './CrewBoard.styles'

export function Lane({
  session,
  nowMs,
  room,
  open,
  onOpen,
}: {
  session: AgentSession
  nowMs: number
  room: number
  open: boolean
  onOpen(): void
}) {
  const lane = laneOf(session, nowMs)
  return (
    <div data-lane={session.id} data-open={open || undefined}>
      <Button
        variant="ghost"
        size="bare"
        onClick={onOpen}
        aria-expanded={open}
        style={{ ...laneStyle, opacity: lane.live || lane.needsYou ? 1 : 0.55 }}
      >
        <span
          aria-hidden
          style={{
            ...laneReachStyle,
            width: `${lane.live ? reachOf(lane.outMs) : 0}%`,
          }}
        />
        <span style={laneFaceStyle}>
          <AgentSprite subagentType={lane.subagentType} state={session.status} size={20} />
        </span>
        <span style={laneNameStyle}>{lane.name}</span>
        {lane.shape !== null && (
          <span style={laneIconStyle}>
            <ToolIcon shape={lane.shape} size={14} />
          </span>
        )}
        <span data-verb style={laneVerbStyle}>
          {lane.verb}
        </span>
        <span data-target style={laneTargetStyle}>
          {lane.target}
        </span>
        <span data-out style={laneClockStyle}>
          {formatClock(lane.outMs / 1000)}
        </span>
      </Button>
      {open && (
        <div data-lane-open style={{ ...laneOpenStyle, maxHeight: laneRoom(room) }}>
          {session.transcript.length > 0 && <Transcript entries={session.transcript} />}
          <CallLog calls={session.stream} live={lane.live} nowMs={nowMs} />
        </div>
      )}
    </div>
  )
}
