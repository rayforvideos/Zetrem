import { Fragment, useCallback, useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import type { AgentSession } from '@/entities/agent-session'
import { Markdown } from '@/shared/markdown/Markdown/Markdown'
import { atEnd } from '@/shared/lib/scroll-state/scroll-state'
import { t } from '@lingui/core/macro'
import { timelineOf } from '../../../lib/timeline/timeline'
import { Row } from '../CallLog/CallLog'
import { ChangeGlimpse } from '../ChangeGlimpse/ChangeGlimpse'

// The diff sits under a call for good, not just the one the teammate has in
// hand, so it can afford to show more of it than CallLog's glimpse does.
const CHANGE_MAX_LINES = 12

type TimelineProps = { session: AgentSession }

// The left pane's live stream: what the teammate said and everything it did,
// merged into the one order it actually happened in. This is the same pane
// Transcript used to fill with words alone; it keeps that scroll behaviour.
export function Timeline({ session }: TimelineProps) {
  const items = timelineOf(session)
  const scrollRef = useRef<HTMLDivElement>(null)
  const following = useRef(true)
  const lastIndex = items.length - 1
  const lastCall = items.at(-1)
  const lastChangeLines = lastCall?.kind === 'call' ? (lastCall.call.change ?? []).length : 0
  const lastEndedAtMs = lastCall?.kind === 'call' ? lastCall.call.endedAtMs : null

  const watch = useCallback(() => {
    const el = scrollRef.current
    if (el === null) return
    following.current = atEnd(el.scrollTop, el.scrollHeight, el.clientHeight)
    el.toggleAttribute('data-at-end', following.current)
    el.toggleAttribute('data-at-start', el.scrollTop <= EDGE)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (el === null) return
    if (following.current) el.scrollTop = el.scrollHeight
    watch()
  }, [items.length, lastChangeLines, lastEndedAtMs, watch])

  return (
    <div
      data-transcript
      className="zt-scroll zt-fade-y"
      ref={scrollRef}
      onScroll={watch}
      style={rootStyle}
    >
      {items.map((item, index) => {
        if (item.kind === 'said') {
          const entry = item.entry
          return (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: the timeline only ever grows at the end, so an item keeps its place
              key={`said-${index}`}
              data-said={entry.role}
              style={entry.role === 'user' ? userStyle : saidStyle}
            >
              {entry.from === undefined ? null : (
                <div data-from style={fromStyle}>
                  {t`from ${entry.from}`}
                </div>
              )}
              <Markdown text={entry.text} />
            </div>
          )
        }
        const call = item.call
        const lit = session.status === 'working' && index === lastIndex
        const change = call.change ?? []
        return (
          <Fragment key={call.id}>
            <Row call={call} lit={lit} count={call.count ?? null} />
            {change.length > 0 && <ChangeGlimpse groups={change} maxLines={CHANGE_MAX_LINES} />}
          </Fragment>
        )
      })}
    </div>
  )
}

const EDGE = 4

const rootStyle: CSSProperties = {
  marginTop: 16,
  flex: '1 1 auto',
  minHeight: 0,
  paddingRight: 8,
  overflowX: 'hidden',
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  fontSize: 13,
  lineHeight: 1.55,
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
}

const saidStyle: CSSProperties = {
  whiteSpace: 'normal',
  minWidth: 0,
}

const fromStyle: CSSProperties = {
  fontSize: 11,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  opacity: 0.7,
  marginBottom: 4,
}

const userStyle: CSSProperties = {
  borderLeft: '2px solid currentColor',
  paddingLeft: 8,
  opacity: 0.55,
}
