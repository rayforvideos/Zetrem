import type { AgentSession } from '@/entities/agent-session'
import { AgentSprite } from '@/entities/teammate'
import { Surface } from '@/entities/surface'
import { UserFace } from '@/entities/user'
import type { FaceId } from '@/entities/user'
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
