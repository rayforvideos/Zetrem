import type { CSSProperties } from 'react'
import type { AgentSession } from '@/entities/agent-session'
import { AgentSprite } from '@/entities/teammate'
import { Surface } from '@/entities/surface'
import { UserFace } from '@/entities/user'
import type { FaceId } from '@/entities/user'
import { ToolIcon } from '@/entities/tool'
import { reachOf } from '@/shared/lib/reach/reach'
import { formatClock } from '@/shared/lib/units/units'
import { Button } from '@/shared/ui/button'
import { laneOf } from '../../lib/lane/lane'
import type { Rect } from '../../lib/grid/grid.types'
import { headcount } from '../../lib/headcount/headcount'
import { leading } from '../../lib/leading/leading'
import { crowded } from '../../lib/grid/grid'
import { focusOf } from '../../lib/focus/focus'
import { attentionId } from '../../lib/attention/attention'
import { CallLog } from '../layers/CallLog/CallLog'
import { Transcript } from '../layers/Transcript/Transcript'
import { logHeadStyle, logPaneStyle, paneStyle, splitStyle } from '../styles'
import { CrewCard } from './CrewCard'
import { t } from '@lingui/core/macro'

type CrewBoardProps = {
  sessions: AgentSession[]
  rect: Rect
  nowMs: number
  face: FaceId
  name: string
  openId: string | null
  heading?: boolean
  onOpen(id: string | null): void
}

export function CrewBoard({
  sessions,
  rect,
  nowMs,
  face,
  name,
  openId,
  heading = true,
  onOpen,
}: CrewBoardProps) {
  const lanes = crowded(sessions.length, rect.h)
  const eye = attentionId(sessions)
  const role = leading(sessions)
  const shown = lanes ? openId : focusOf(sessions, openId)
  const open = sessions.find((session) => session.id === shown) ?? null

  return (
    <div
      data-crew-board={sessions.length}
      style={{
        ...positionStyle,
        transform: `translate(${rect.x}px, ${rect.y}px)`,
        width: rect.w,
        height: rect.h,
      }}
    >
      <Surface style={{ height: '100%' }}>
        <div style={frameStyle}>
          {heading && (
            <div style={youRowStyle}>
              <span style={youStyle}>
                <UserFace face={face} size={22} className="max-w-none" />
                <span style={youNameStyle}>{name.length > 0 ? name : t`You`}</span>
                <span data-leading style={roleStyle}>
                  {role}
                </span>
              </span>
              <span data-headcount style={headStyle}>
                {headcount(sessions)}
              </span>
            </div>
          )}

          <div
            className={lanes ? 'zt-scroll zt-fade-y' : 'zt-scroll'}
            style={lanes ? laneListStyle : cardsStyle}
          >
            {sessions.map((session) =>
              lanes ? (
                <Lane
                  key={session.id}
                  session={session}
                  nowMs={nowMs}
                  room={rect.h}
                  open={session.id === shown}
                  onOpen={() => onOpen(session.id === shown ? null : session.id)}
                />
              ) : (
                <CrewCard
                  key={session.id}
                  session={session}
                  nowMs={nowMs}
                  attention={session.id === eye}
                  open={session.id === shown}
                  onOpen={() => onOpen(session.id)}
                />
              ),
            )}
          </div>

          {open !== null && !lanes && (
            <div data-crew-detail={open.id} style={detailStyle}>
              <span style={detailHeadStyle}>
                <AgentSprite
                  subagentType={open.subagentType || open.label}
                  state={open.status}
                  size={18}
                />
                <span>{laneOf(open, nowMs).name}</span>
                <span style={detailNoteStyle}>{open.label}</span>
              </span>
              <div style={splitStyle}>
                <div data-crew-said style={paneStyle}>
                  {open.transcript.length > 0 ? (
                    <Transcript entries={open.transcript} />
                  ) : (
                    <p style={quietStyle}>{t`Nothing written yet.`}</p>
                  )}
                </div>
                <div data-crew-log style={logPaneStyle}>
                  {open.stream.length > 0 && <span style={logHeadStyle}>{t`What they did`}</span>}
                  <CallLog calls={open.stream} live={open.status === 'working'} nowMs={nowMs} />
                </div>
              </div>
            </div>
          )}
        </div>
      </Surface>
    </div>
  )
}

function Lane({
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

const positionStyle: CSSProperties = { position: 'absolute', top: 0, left: 0 }

const CARD_MIN = 196

const frameStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  minHeight: 0,
  padding: 16,
}

const youRowStyle: CSSProperties = {
  position: 'relative',
  flex: '0 0 auto',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2px 4px 0',
}

const youStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
}

const youNameStyle: CSSProperties = { fontSize: 12.5 }

const roleStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  paddingInline: 8,
  paddingBlock: 2,
  borderRadius: 999,
  border: '1px solid var(--color-border)',
  fontSize: 11,
  letterSpacing: '0.02em',
  opacity: 0.75,
}

const headStyle: CSSProperties = {
  position: 'absolute',
  right: 0,
  fontSize: 11.5,
  letterSpacing: '0.05em',
  opacity: 0.45,
}

const cardsStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fill, minmax(${CARD_MIN - 10}px, 1fr))`,
  gap: 10,
  alignContent: 'start',
  marginTop: 12,
  flex: '0 0 auto',
  maxHeight: '50%',
  overflowY: 'auto',
  paddingRight: 8,
  paddingBottom: 4,
}

const laneListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  marginTop: 8,
  minHeight: 0,
  flex: '1 1 auto',
  paddingRight: 8,
  overflowY: 'auto',
}

const detailStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  minHeight: 0,
  flex: '1 1 auto',
  marginTop: 12,
  paddingTop: 12,
  borderTop: '1px solid var(--color-border)',
  overflow: 'hidden',
}

const detailHeadStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 12.5,
  flex: '0 0 auto',
}

const quietStyle: CSSProperties = { margin: 0, fontSize: 12, opacity: 0.45 }

const detailNoteStyle: CSSProperties = {
  minWidth: 0,
  fontSize: 11.5,
  opacity: 0.5,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

const laneStyle: CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  width: '100%',
  minWidth: 0,
  height: 'auto',
  padding: '7px 8px',
  borderRadius: 8,
  fontSize: 12,
  overflow: 'hidden',
  textAlign: 'left',
}

const laneReachStyle: CSSProperties = {
  position: 'absolute',
  insetBlock: 0,
  left: 0,
  borderRadius: 8,
  background: 'linear-gradient(to right, currentColor, transparent)',
  opacity: 0.09,
  pointerEvents: 'none',
}

const laneFaceStyle: CSSProperties = {
  position: 'relative',
  flex: '0 0 auto',
  display: 'flex',
}

const laneNameStyle: CSSProperties = {
  position: 'relative',
  flex: '0 0 auto',
  minWidth: 62,
}

const laneIconStyle: CSSProperties = {
  position: 'relative',
  flex: '0 0 auto',
  opacity: 0.7,
}

const laneVerbStyle: CSSProperties = {
  position: 'relative',
  flex: '0 0 auto',
  opacity: 0.8,
  maxWidth: '46%',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

const laneTargetStyle: CSSProperties = {
  position: 'relative',
  flex: '1 1 auto',
  minWidth: 0,
  fontFamily: 'var(--zt-mono)',
  fontSize: 11,
  opacity: 0.5,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

const laneClockStyle: CSSProperties = {
  position: 'relative',
  flex: '0 0 auto',
  fontFamily: 'var(--zt-mono)',
  fontVariantNumeric: 'tabular-nums',
  fontSize: 11,
  opacity: 0.5,
}

function laneRoom(room: number): number {
  return Math.max(96, Math.min(220, Math.round(room * 0.45)))
}

const laneOpenStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  padding: '2px 8px 12px 36px',
  minHeight: 0,
  overflow: 'hidden',
}
