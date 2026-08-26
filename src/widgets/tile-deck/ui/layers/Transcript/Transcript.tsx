import { useCallback, useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import type { TranscriptEntry } from '@/entities/agent-session'
import { Markdown } from '@/shared/markdown/Markdown/Markdown'
import { atEnd } from '@/shared/lib/scroll-state/scroll-state'
import { t } from '@lingui/core/macro'

type TranscriptProps = { entries: TranscriptEntry[] }

export function Transcript({ entries }: TranscriptProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const following = useRef(true)

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
  }, [entries, watch])

  return (
    <div
      data-transcript
      className="zt-scroll zt-fade-y"
      ref={scrollRef}
      onScroll={watch}
      style={rootStyle}
    >
      {entries.map((entry, index) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: the transcript only ever grows at the end, so an entry keeps its place
          key={`${index}-${entry.role}`}
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
      ))}
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
