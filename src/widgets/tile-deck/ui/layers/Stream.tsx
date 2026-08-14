import type { CSSProperties } from 'react'
import { shapeOfLine } from '@/shared/lib/tool-line/tool-line'
import { targetOf, verbOf } from '@/shared/lib/tool-verb/tool-verb'
import { ToolIcon } from '@/shared/graphics/tool-icon'

type StreamProps = { lines: string[]; live: boolean }

export function Stream({ lines, live }: StreamProps) {
  const shown = lines.slice(-6)
  const lastIndex = shown.length - 1
  return (
    <div data-stream style={rootStyle}>
      {shown.map((line, index) => {
        const shape = shapeOfLine(line)
        const now = live && index === lastIndex
        return (
          <div
            key={`${index}-${line}`}
            data-now={now || undefined}
            style={{ ...lineStyle, opacity: now ? 1 : 0.3 + (0.35 * (index + 1)) / shown.length }}
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
  flex: '1 1 auto',
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  fontSize: 11.5,
  overflow: 'hidden',
}

const lineStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 7,
  minWidth: 0,
}

const iconStyle: CSSProperties = { flex: '0 0 auto', display: 'flex' }

const verbStyle: CSSProperties = { flex: '0 0 auto' }

const targetStyle: CSSProperties = {
  fontFamily: 'var(--zt-mono)',
  fontSize: 11,
  opacity: 0.7,
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
  overflow: 'hidden',
}
