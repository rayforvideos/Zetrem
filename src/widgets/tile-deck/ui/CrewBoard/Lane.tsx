import type { AgentSession } from '@/entities/agent-session'
import { AgentSprite } from '@/entities/teammate'
import { ToolIcon } from '@/entities/tool'
import { reachOf } from '@/shared/lib/reach/reach'
import { formatClock } from '@/shared/lib/units/units'
import { Button } from '@/shared/ui/button'
import { laneOf } from '../../lib/lane/lane'
import { StateChip } from '../layers/StateChip/StateChip'
import { CallLog } from '../layers/CallLog/CallLog'
import { Helpers } from '../layers/Helpers/Helpers'
import { Timeline } from '../layers/Timeline/Timeline'
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
  helpers = [],
  nowMs,
  room,
  open,
  held = false,
  onOpen,
}: {
  session: AgentSession
  // This teammate's own subagents, shown under its transcript same as a tile.
  helpers?: AgentSession[]
  nowMs: number
  room: number
  open: boolean
  // The run this teammate belongs to has stopped for the person.
  held?: boolean
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
        <StateChip status={session.status} held={held} />
        <span data-out style={laneClockStyle}>
          {formatClock(lane.outMs / 1000)}
        </span>
      </Button>
      {open && (
        <div data-lane-open style={{ ...laneOpenStyle, maxHeight: laneRoom(room) }}>
          {(session.transcript.length > 0 || session.stream.length > 0) && (
            <Timeline session={session} />
          )}
          <Helpers helpers={helpers} />
          <CallLog calls={session.stream} live={lane.live} nowMs={nowMs} />
        </div>
      )}
    </div>
  )
}
