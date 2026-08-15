import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import { shapeOfLine } from '@/shared/lib/tool-line/tool-line'
import { targetOf, verbOf } from '@/shared/lib/tool-verb/tool-verb'
import { ToolIcon } from '@/shared/graphics/tool-icon'

type StreamProps = { lines: string[]; live: boolean }

export function Stream({ lines, live }: StreamProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const lastIndex = lines.length - 1

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [lines.length])

  if (lines.length === 0) return null

  return (
    <div data-stream ref={scrollRef} className="zt-scroll" style={rootStyle}>
      {lines.map((line, index) => {
        const shape = shapeOfLine(line)
        const now = live && index === lastIndex
        return (
          <div
            key={`${index}-${line}`}
            data-now={now || undefined}
            style={now ? { ...lineStyle, ...nowStyle } : lineStyle}
          >
            <span style={iconStyle}>
              <ToolIcon shape={shape} />
            </span>
            {shape.kind === 'plain' ? (
              <span style={targetStyle}>{line}</span>
            ) : (
              <>
                <span style={verbStyle}>{verbOf(shape)}</span>
                <span style={targetStyle}>{targetOf(shape)}</span>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

const rootStyle: CSSProperties = {
  marginTop: 16,
  minHeight: 0,
  maxHeight: '45%',
  flex: '0 1 auto',
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  fontSize: 11.5,
  overflowY: 'auto',
}

const lineStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 7,
  minWidth: 0,
  flex: '0 0 auto',
  opacity: 0.55,
}

const nowStyle: CSSProperties = { opacity: 1 }

const iconStyle: CSSProperties = { flex: '0 0 auto', display: 'flex' }

const verbStyle: CSSProperties = { flex: '0 0 auto' }

const targetStyle: CSSProperties = {
  fontFamily: 'var(--zt-mono)',
  fontSize: 11,
  opacity: 0.75,
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
  overflow: 'hidden',
}
