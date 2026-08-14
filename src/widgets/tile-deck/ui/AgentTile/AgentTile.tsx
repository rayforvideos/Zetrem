import type { CSSProperties } from 'react'
import type { AgentSession } from '@/entities/agent-session'
import { Surface } from '@/entities/surface'
import { MOTION } from '@/shared/config/motion/motion'
import type { Rect } from '../../lib/grid/grid.types'
import { Headline } from '../layers/Headline'
import { Stream } from '../layers/Stream'
import { Tally } from '../layers/Tally'
import { Telemetry } from '../layers/Telemetry'
import { Transcript } from '../layers/Transcript'

type AgentTileProps = {
  session: AgentSession
  rect: Rect
  delayMs: number
  nowMs: number
  sweeping?: boolean
  closing?: boolean
  attention?: boolean
}

export function AgentTile({
  session,
  rect,
  delayMs,
  nowMs,
  sweeping = false,
  closing = false,
  attention = false,
}: AgentTileProps) {
  const transcriptOpen = attention && session.transcript.length > 0
  const durationMs = closing ? MOTION.mergeMs : MOTION.fanMs
  const sweep = sweeping || closing
  return (
    <div
      data-status={session.status}
      data-closing={closing || undefined}
      style={{
        ...positionStyle,
        transform: `translate(${rect.x}px, ${rect.y}px)`,
        width: rect.w,
        height: rect.h,
        opacity: closing ? 0 : 1,
        transition: [
          `transform ${durationMs}ms ${MOTION.easing} ${delayMs}ms`,
          `width ${durationMs}ms ${MOTION.easing} ${delayMs}ms`,
          `height ${durationMs}ms ${MOTION.easing} ${delayMs}ms`,
          `opacity ${MOTION.mergeMs}ms ${MOTION.easing} ${delayMs}ms`,
        ].join(', '),
      }}
    >
      <Surface
        behind={<Telemetry session={session} nowMs={nowMs} />}
        style={{ height: '100%', padding: 20 }}
      >
        {session.status === 'waiting' && (
          <div data-waiting style={waitingMarkStyle(attention)} />
        )}
        <div style={bodyStyle}>
          <Headline session={session} withText={!transcriptOpen} />
          {!transcriptOpen && <Tally lines={session.stream} />}
          {transcriptOpen && <Transcript entries={session.transcript} />}
          {!sweep && <Stream lines={session.stream} />}
        </div>
      </Surface>
    </div>
  )
}

const bodyStyle: CSSProperties = {
  position: 'relative',
  zIndex: 3,
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
    inset: 0,
    borderRadius: 18,
    border: '1px solid currentColor',
    opacity: attention ? 0.85 : 0.25,
    pointerEvents: 'none',
  }
}
