import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import type { TranscriptEntry } from '@/entities/agent-session'

type TranscriptProps = { entries: TranscriptEntry[] }

export function Transcript({ entries }: TranscriptProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [entries])

  return (
    <div data-transcript className="zt-scroll" ref={scrollRef} style={rootStyle}>
      {entries.map((entry, index) => (
        <div key={`${index}-${entry.role}`} style={entry.role === 'user' ? userStyle : undefined}>
          {entry.text}
        </div>
      ))}
    </div>
  )
}

const rootStyle: CSSProperties = {
  position: 'relative',
  zIndex: 3,
  marginTop: 10,
  maxHeight: '46%',
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  fontSize: 13,
  lineHeight: 1.5,
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
}

const userStyle: CSSProperties = {
  borderLeft: '2px solid currentColor',
  paddingLeft: 8,
  opacity: 0.75,
}
