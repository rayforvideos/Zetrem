import type { CSSProperties } from 'react'
import { metrics } from '@/entities/agent-session'
import type { AgentSession } from '@/entities/agent-session'

type TelemetryProps = { session: AgentSession; nowMs: number }

export function Telemetry({ session, nowMs }: TelemetryProps) {
  return (
    <div style={rootStyle}>
      {metrics.map((metric) => (
        <div key={metric.id} style={itemStyle}>
          <span style={labelStyle}>{metric.label}</span>
          <span style={valueStyle}>{metric.format(metric.read(session, nowMs))}</span>
        </div>
      ))}
    </div>
  )
}

const rootStyle: CSSProperties = {
  position: 'absolute',
  right: 22,
  top: 20,
  zIndex: 1,
  display: 'flex',
  gap: 14,
  fontFamily: 'var(--zt-mono)',
  fontVariantNumeric: 'tabular-nums',
  pointerEvents: 'none',
}

const itemStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  gap: 1,
}

const labelStyle: CSSProperties = {
  fontSize: 9,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
}

const valueStyle: CSSProperties = { fontSize: 12.5 }
