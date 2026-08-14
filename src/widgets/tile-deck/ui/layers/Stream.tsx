import type { CSSProperties } from 'react'
import { shapeOfLine } from '@/shared/lib/tool-line/tool-line'
import type { ToolShape } from '@/shared/lib/tool-shape/tool-shape.types'
import { ToolIcon } from '@/shared/graphics/tool-icon'

type StreamProps = { lines: string[] }

export function Stream({ lines }: StreamProps) {
  const shown = lines.slice(-8)
  return (
    <div style={rootStyle}>
      {shown.map((line, index) => {
        const shape = shapeOfLine(line)
        return (
          <div
            key={`${index}-${line}`}
            style={{ ...lineStyle, opacity: 0.45 + (0.55 * (index + 1)) / shown.length }}
          >
            <ToolIcon shape={shape} />
            <span style={textStyle}>{shape.kind === 'plain' ? line : text(shape)}</span>
          </div>
        )
      })}
    </div>
  )
}

function text(shape: ToolShape): string {
  switch (shape.kind) {
    case 'file':
      return shape.name
    case 'command':
      return shape.command
    case 'search':
      return shape.pattern
    case 'web':
      return shape.label
    case 'agent':
      return shape.description
    case 'todo':
      return 'Todo'
    default:
      return shape.name
  }
}

const rootStyle: CSSProperties = {
  position: 'relative',
  zIndex: 2,
  marginTop: 14,
  minHeight: 0,
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: 3,
  fontFamily: 'var(--zt-mono)',
  fontSize: 10.5,
  overflow: 'hidden',
}

const lineStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  minWidth: 0,
}

const textStyle: CSSProperties = {
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
  overflow: 'hidden',
}
