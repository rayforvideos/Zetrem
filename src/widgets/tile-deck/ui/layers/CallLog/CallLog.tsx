import { useCallback, useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import type { Call } from '@/entities/agent-session'
import type { ChangeCount } from '@/entities/tool'
import { ToolIcon, targetOf, verbOf } from '@/entities/tool'
import { atEnd } from '@/shared/lib/measure/scroll-state/scroll-state'
import { shapeOfCall } from '../../../lib/now/now'
import { fillOf } from '../../../lib/fill/fill'
import { ChangeMark } from '../ChangeGlimpse/ChangeGlimpse'
import { ICON_W, NowStage } from '../NowStage/NowStage'
import { t } from '@lingui/core/macro'

type CallLogProps = { calls: Call[]; live: boolean; nowMs: number }

export function CallLog({ calls, live, nowMs }: CallLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const following = useRef(true)
  const lastIndex = calls.length - 1

  const watch = useCallback(() => {
    const el = scrollRef.current
    if (el === null) return
    following.current = atEnd(el.scrollTop, el.scrollHeight, el.clientHeight)
    el.toggleAttribute('data-at-end', following.current)
    el.toggleAttribute('data-at-start', el.scrollTop <= 4)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (el === null) return undefined
    if (following.current) el.scrollTop = el.scrollHeight
    watch()
    const frame = requestAnimationFrame(() => {
      if (following.current) el.scrollTop = el.scrollHeight
      watch()
    })
    return () => cancelAnimationFrame(frame)
  }, [calls.length, watch])

  if (calls.length === 0) return null

  return (
    <div
      data-call-log
      ref={scrollRef}
      onScroll={watch}
      className="zt-scroll zt-fade-y"
      style={rootStyle}
    >
      {calls.map((call, index) => {
        const now = index === lastIndex
        if (now && live) {
          return <NowStage key={call.id} call={call} live nowMs={nowMs} />
        }
        return <Row key={call.id} call={call} lit={now} count={call.count ?? null} />
      })}
    </div>
  )
}

// Exported so the left pane's Timeline can draw a call the same way the
// right-hand log does, rather than keeping a second copy of this row.
export function Row({ call, lit, count }: { call: Call; lit: boolean; count: ChangeCount | null }) {
  const shape = shapeOfCall(call.line)
  const target = shape.kind === 'plain' ? call.line : targetOf(shape)
  const fill = fillOf(call)

  return (
    <div
      data-call={call.failed ? 'failed' : 'done'}
      style={lit ? { ...rowStyle, opacity: 0.8 } : rowStyle}
    >
      <span style={{ ...trackStyle, width: `${fill}%` }} />
      <span style={iconStyle}>
        <ToolIcon shape={shape} size={18} />
      </span>
      <span style={verbStyle}>{verbOf(shape)}</span>
      <span style={targetStyle}>{target}</span>
      <span style={tailStyle}>
        {count !== null && <ChangeMark count={count} />}
        {call.failed ? (
          <span style={failedStyle}>{t`failed`}</span>
        ) : (
          call.note.length > 0 && <span style={noteStyle}>{call.note}</span>
        )}
      </span>
    </div>
  )
}

const rootStyle: CSSProperties = {
  minHeight: 0,
  flex: '0 1 auto',
  paddingRight: 8,
  display: 'flex',
  flexDirection: 'column',
  gap: 3,
  overflowY: 'auto',
  fontSize: 11.5,
}

const rowStyle: CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  gap: 7,
  minWidth: 0,
  flex: '0 0 auto',
  padding: '3px 5px 3px 0',
  borderRadius: 5,
  opacity: 0.55,
  overflow: 'hidden',
}

const trackStyle: CSSProperties = {
  position: 'absolute',
  left: 0,
  top: 0,
  bottom: 0,
  background: 'linear-gradient(to right, currentColor, transparent)',
  opacity: 0.13,
  borderRadius: 5,
  pointerEvents: 'none',
}

const iconStyle: CSSProperties = {
  flex: '0 0 auto',
  display: 'flex',
  alignItems: 'center',
  width: ICON_W,
}

const verbStyle: CSSProperties = { flex: '0 0 auto' }

const targetStyle: CSSProperties = {
  flex: '1 1 auto',
  minWidth: 0,
  fontFamily: 'var(--zt-mono)',
  fontSize: 11,
  opacity: 0.75,
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
  overflow: 'hidden',
}

const tailStyle: CSSProperties = {
  flex: '0 0 auto',
  marginLeft: 'auto',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
}

const noteStyle: CSSProperties = {
  flex: '0 0 auto',
  paddingLeft: 6,
  opacity: 0.65,
  whiteSpace: 'nowrap',
}

const failedStyle: CSSProperties = {
  flex: '0 0 auto',
  paddingLeft: 6,
  color: 'var(--color-removed)',
  whiteSpace: 'nowrap',
}
