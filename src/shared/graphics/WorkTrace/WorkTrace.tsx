import type { CSSProperties } from 'react'
import type { Mark } from './work-trace/work-trace.types'
import { barsOf } from './work-trace/work-trace'

const TOP = 12
const GUTTER = 4

export function WorkTrace({ marks }: { marks: Mark[] }) {
  if (marks.length === 0) return null
  const bars = barsOf(marks)

  return (
    <div data-trace aria-hidden style={rootStyle}>
      <span style={baselineStyle} />
      <div style={rowStyle}>
        {bars.map((bar, index) => (
          <span
            key={index}
            data-bar={bar.failed ? 'failed' : bar.running ? 'running' : 'done'}
            style={{
              width: bar.width,
              height: bar.failed ? GUTTER : bar.height,
              marginBottom: bar.failed ? -GUTTER : 0,
              ...(bar.failed ? failedStyle : bar.running ? runningStyle : barStyle),
            }}
          />
        ))}
      </div>
    </div>
  )
}

const rootStyle: CSSProperties = {
  position: 'relative',
  height: TOP + GUTTER,
  flex: '0 0 auto',
  overflow: 'hidden',
}

const baselineStyle: CSSProperties = {
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: GUTTER,
  height: 1,
  background: 'currentColor',
  opacity: 0.18,
}

const rowStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'flex-end',
  gap: 2,
  paddingBottom: GUTTER,
}

const barStyle: CSSProperties = {
  flex: '0 0 auto',
  borderRadius: 1,
  background: 'currentColor',
  opacity: 0.4,
}

const runningStyle: CSSProperties = {
  ...barStyle,
  opacity: 0.9,
  animation: 'zt-pulse 1.1s ease-in-out infinite',
}

const failedStyle: CSSProperties = {
  flex: '0 0 auto',
  borderRadius: 1,
  background: 'var(--color-removed)',
  opacity: 0.85,
}
