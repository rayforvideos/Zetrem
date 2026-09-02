import type { CSSProperties } from 'react'
import type { AgentSession } from '@/entities/agent-session'
import { AgentSprite } from '@/entities/teammate'
import { Surface } from '@/shared/parts/Surface/Surface'
import { UserFace } from '@/entities/user'
import type { FaceId } from '@/entities/user'
import { MOTION, staggerDelay } from '@/shared/config/motion/motion'
import type { Presence } from '../../lib/board-phase/board-phase.types'
import { laneOf } from '../../lib/lane/lane'
import type { Rect } from '../../lib/grid/grid.types'
import { headcount } from '../../lib/headcount/headcount'
import { leading } from '../../lib/leading/leading'
import { crowded } from '../../lib/grid/grid'
import { focusOf } from '../../lib/focus/focus'
import { attentionId } from '../../lib/attention/attention'
import { timelineOf } from '../../lib/timeline/timeline'
import { CallLog } from '../layers/CallLog/CallLog'
import { Helpers } from '../layers/Helpers/Helpers'
import { Timeline } from '../layers/Timeline/Timeline'
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
  // Set while the deck is flipping between tiles and the board, so the board
  // can be seen to come and go instead of cutting.
  presence?: Presence | null
  // A teammate's own subagents, keyed by the teammate's session id. Passed
  // through to whichever pane opens, cards or lanes alike.
  helpers?: Map<string, AgentSession[]>
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
  presence = null,
  helpers = EMPTY_HELPERS,
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
      data-presence={presence ?? undefined}
      style={{
        ...positionStyle,
        transform: `translate(${rect.x}px, ${rect.y}px)`,
        width: rect.w,
        height: rect.h,
        // A board on its way out must not catch the clicks meant for the tiles
        // arriving underneath it.
        pointerEvents: presence === 'leaving' ? 'none' : undefined,
      }}
    >
      <Surface style={{ height: '100%', ...presenceStyle(presence) }}>
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
            {sessions.map((session, index) =>
              lanes ? (
                <Lane
                  key={session.id}
                  session={session}
                  helpers={helpers.get(session.id) ?? EMPTY_LIST}
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
                  delayMs={presence === 'arriving' ? staggerDelay(index) : null}
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
                  {timelineOf(open).length > 0 ? (
                    <Timeline session={open} />
                  ) : (
                    <p style={quietStyle}>{t`Nothing written yet.`}</p>
                  )}
                </div>
                <div data-crew-log style={logPaneStyle}>
                  {open.stream.length > 0 && <span style={logHeadStyle}>{t`What they did`}</span>}
                  <CallLog calls={open.stream} live={open.status === 'working'} nowMs={nowMs} />
                </div>
              </div>
              <Helpers helpers={helpers.get(open.id) ?? EMPTY_LIST} />
            </div>
          )}
        </div>
      </Surface>
    </div>
  )
}

// The board carries its own place in a transform, so the arrival scales the
// surface inside it rather than the frame that holds it.
function presenceStyle(presence: Presence | null): CSSProperties {
  if (presence === null) return EMPTY_STYLE
  const shape =
    presence === 'leaving'
      ? `zt-tile-out ${MOTION.leaveMs}ms ${MOTION.leaving}`
      : `zt-tile-in ${MOTION.arriveMs}ms ${MOTION.spring}`
  return { transformOrigin: 'center', animation: `${shape} both` }
}

const EMPTY_STYLE: CSSProperties = {}

// Stable empty fallbacks: Helpers and the lane list are keyed off session id
// lookups that may miss, and a fresh [] each render would retrigger memoised
// children for no reason.
const EMPTY_LIST: AgentSession[] = []
const EMPTY_HELPERS: Map<string, AgentSession[]> = new Map()

import { Lane } from './Lane'
import {
  cardsStyle,
  detailHeadStyle,
  detailNoteStyle,
  detailStyle,
  frameStyle,
  headStyle,
  laneListStyle,
  positionStyle,
  quietStyle,
  roleStyle,
  youNameStyle,
  youRowStyle,
  youStyle,
} from './CrewBoard.styles'
