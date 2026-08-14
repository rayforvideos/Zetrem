import type { CSSProperties } from 'react'
import { metrics } from '@/entities/agent-session'
import type { AgentSession } from '@/entities/agent-session'

type GaugeProps = { session: AgentSession; nowMs: number }

export function Gauge({ session, nowMs }: GaugeProps) {
  const known = metrics.filter((metric) => metric.known(session))
  if (known.length === 0) return null

  return (
    <div data-gauge style={rootStyle}>
      {known.map((metric) => (
        <div key={metric.id} style={itemStyle}>
          <span style={labelStyle}>{metric.label}</span>
          <span style={valueStyle}>{metric.format(metric.read(session, nowMs))}</span>
        </div>
      ))}
    </div>
  )
}

const rootStyle: CSSProperties = {
  flex: '0 0 auto',
  marginTop: 'auto',
  paddingTop: 12,
  borderTop: '1px solid var(--border)',
  display: 'flex',
  gap: 22,
  fontFamily: 'var(--zt-mono)',
  fontVariantNumeric: 'tabular-nums',
}

const itemStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  gap: 6,
  minWidth: 0,
}

const labelStyle: CSSProperties = {
  fontSize: 9,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  opacity: 0.45,
}

const valueStyle: CSSProperties = { fontSize: 11.5 }
