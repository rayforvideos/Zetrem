import type { CSSProperties } from 'react'
import { ChevronDown } from 'lucide-react'
import type { AgentSession } from '@/entities/agent-session'
import { AgentSprite } from '@/entities/agent-session/ui/AgentSprite/AgentSprite'
import { Surface } from '@/entities/surface'
import { ToolIcon } from '@/shared/graphics/tool-icon'
import { reachOf } from '@/shared/lib/reach/reach'
import { formatClock } from '@/shared/lib/units/units'
import { Button } from '@/shared/ui/button'
import { laneOf } from '../../lib/lane/lane'
import type { Rect } from '../../lib/grid/grid.types'
import { headcount } from '../../lib/headcount/headcount'
import { CallLog } from '../layers/CallLog/CallLog'

type CrewBoardProps = {
  sessions: AgentSession[]
  rect: Rect
  nowMs: number
  openId: string | null
  onOpen(id: string | null): void
}

export function CrewBoard({ sessions, rect, nowMs, openId, onOpen }: CrewBoardProps) {
  return (
    <div
      data-crew-board={sessions.length}
      style={{
        ...positionStyle,
        transform: `translate(${rect.x}px, ${rect.y}px)`,
        width: rect.w,
        maxHeight: rect.h,
      }}
    >
      <Surface style={{ maxHeight: rect.h, padding: 14, display: 'flex', flexDirection: 'column' }}>
        <span data-headcount style={headStyle}>
          {headcount(sessions)}
        </span>
        <div className="zt-scroll" style={listStyle}>
          {sessions.map((session) => {
            const lane = laneOf(session, nowMs)
            const open = session.id === openId
            return (
              <div key={session.id} data-lane={session.id} data-open={open || undefined}>
                <Button
                  variant="quiet"
                  size="bare"
                  onClick={() => onOpen(open ? null : session.id)}
                  aria-expanded={open}
                  style={{ ...laneStyle, opacity: lane.live || lane.needsYou ? 1 : 0.55 }}
                >
                  <span
                    aria-hidden
                    style={{ ...reachStyle, width: `${lane.live ? reachOf(lane.outMs) : 0}%` }}
                  />
                  <span style={faceStyle}>
                    <AgentSprite subagentType={lane.subagentType} state={session.status} size={20} />
                  </span>
                  <span style={nameStyle}>{lane.name}</span>
                  {lane.shape !== null && (
                    <span style={iconStyle}>
                      <ToolIcon shape={lane.shape} />
                    </span>
                  )}
                  <span data-verb style={verbStyle(lane.needsYou)}>{lane.verb}</span>
                  <span data-target style={targetStyle}>
                    {lane.target}
                  </span>
                  <span data-out style={clockStyle}>
                    {formatClock(lane.outMs / 1000)}
                  </span>
                  <ChevronDown
                    aria-hidden
                    className="size-3.5"
                    style={{ ...chevronStyle, transform: open ? 'rotate(180deg)' : 'none' }}
                  />
                </Button>
                {open && (
                  <div data-lane-open style={openStyle}>
                    {session.headline.trim().length > 0 && (
                      <p style={saidStyle}>{session.headline.trim()}</p>
                    )}
                    <CallLog calls={session.stream} live={lane.live} nowMs={nowMs} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Surface>
    </div>
  )
}

const positionStyle: CSSProperties = { position: 'absolute', top: 0, left: 0 }

const headStyle: CSSProperties = {
  flex: '0 0 auto',
  padding: '2px 6px 10px',
  fontSize: 11.5,
  letterSpacing: '0.06em',
  opacity: 0.55,
}

const listStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  minHeight: 0,
  flex: '1 1 auto',
  overflowY: 'auto',
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

const reachStyle: CSSProperties = {
  position: 'absolute',
  insetBlock: 0,
  left: 0,
  borderRadius: 8,
  background: 'linear-gradient(to right, currentColor, transparent)',
  opacity: 0.09,
  pointerEvents: 'none',
}

const faceStyle: CSSProperties = { position: 'relative', flex: '0 0 auto', display: 'flex' }

const nameStyle: CSSProperties = { position: 'relative', flex: '0 0 auto', minWidth: 62 }

const iconStyle: CSSProperties = { position: 'relative', flex: '0 0 auto', opacity: 0.7 }

function verbStyle(needsYou: boolean): CSSProperties {
  return {
    position: 'relative',
    flex: '0 0 auto',
    opacity: needsYou ? 1 : 0.75,
    maxWidth: '46%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }
}

const targetStyle: CSSProperties = {
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

const clockStyle: CSSProperties = {
  position: 'relative',
  flex: '0 0 auto',
  fontFamily: 'var(--zt-mono)',
  fontVariantNumeric: 'tabular-nums',
  fontSize: 11,
  opacity: 0.5,
}

const chevronStyle: CSSProperties = {
  position: 'relative',
  flex: '0 0 auto',
  opacity: 0.4,
  transition: 'transform 180ms ease',
}

const openStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  padding: '2px 8px 12px 36px',
  maxHeight: 220,
  overflow: 'hidden',
}

const saidStyle: CSSProperties = { fontSize: 12, lineHeight: 1.5, opacity: 0.8, margin: 0 }
