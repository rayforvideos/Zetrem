import type { CSSProperties } from 'react'
import type { AgentSession } from '@/entities/agent-session'
import { Surface } from '@/entities/surface'
import { MOTION } from '@/shared/config/motion/motion'
import type { Rect } from '../../lib/grid/grid.types'
import { Gauge } from '../layers/Gauge/Gauge'
import { Headline } from '../layers/Headline/Headline'
import { CallLog } from '../layers/CallLog/CallLog'
import { Transcript } from '../layers/Transcript/Transcript'

type AgentTileProps = {
  session: AgentSession
  rect: Rect
  delayMs: number
  nowMs: number
  sweeping?: boolean
  closing?: boolean
  attention?: boolean
  onDismiss?: () => void
}

export function AgentTile({
  session,
  rect,
  delayMs,
  nowMs,
  sweeping = false,
  closing = false,
  attention = false,
  onDismiss,
}: AgentTileProps) {
  const transcriptOpen = session.transcript.length > 0
  const durationMs = closing ? MOTION.mergeMs : MOTION.fanMs
  const sweep = sweeping || closing
  const live = session.status === 'working'
  const now = session.stream.at(-1) ?? null
  return (
    <div
      data-status={session.status}
      data-closing={closing || undefined}
      style={{
        ...positionStyle,
        transform: `translate(${rect.x}px, ${rect.y}px)`,
        width: rect.w,
        height: rect.h,
        transition: [
          `transform ${durationMs}ms ${MOTION.easing} ${delayMs}ms`,
          `width ${durationMs}ms ${MOTION.easing} ${delayMs}ms`,
          `height ${durationMs}ms ${MOTION.easing} ${delayMs}ms`,
        ].join(', '),
      }}
    >
      <div data-presence={closing ? 'leaving' : 'arriving'} style={presenceStyle(closing, delayMs)}>
      <Surface style={{ height: '100%', padding: 18 }}>
        {session.status === 'waiting' && (
          <div data-waiting style={waitingMarkStyle(attention)} />
        )}
        <div style={bodyStyle}>
          <Headline session={session} withText={!transcriptOpen} onDismiss={onDismiss} />
          {transcriptOpen && <Transcript entries={session.transcript} />}
          {!sweep && (
            <div style={footerStyle}>
              {live && now === null && (session.doing ?? '').length > 0 && (
                <div data-doing style={doingStyle}>
                  {session.doing}
                </div>
              )}
              <CallLog calls={session.stream} live={live} nowMs={nowMs} />
            </div>
          )}
          {!sweep && <Gauge session={session} nowMs={nowMs} />}
        </div>
      </Surface>
      </div>
    </div>
  )
}

function presenceStyle(closing: boolean, delayMs: number): CSSProperties {
  const shape = closing
    ? `zt-tile-out ${MOTION.leaveMs}ms ${MOTION.leaving}`
    : `zt-tile-in ${MOTION.arriveMs}ms ${MOTION.spring} ${delayMs}ms`
  return {
    height: '100%',
    transformOrigin: 'center',
    animation: `${shape} both`,
  }
}

const footerStyle: CSSProperties = {
  marginTop: 14,
  marginBottom: 4,
  flex: '0 1 auto',
  maxHeight: '45%',
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  minWidth: 0,
}

const doingStyle: CSSProperties = {
  flex: '0 0 auto',
  fontSize: 11.5,
  opacity: 0.55,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

const bodyStyle: CSSProperties = {
  position: 'relative',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
}

const positionStyle: CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
}

function waitingMarkStyle(attention: boolean): CSSProperties {
  return {
    position: 'absolute',
    inset: -18,
    borderRadius: 18,
    border: '1px solid currentColor',
    opacity: attention ? 0.85 : 0.25,
    pointerEvents: 'none',
    zIndex: 2,
  }
}
