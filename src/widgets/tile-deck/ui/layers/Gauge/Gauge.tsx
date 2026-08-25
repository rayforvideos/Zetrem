import type { CSSProperties } from 'react'
import { metrics } from '@/entities/agent-session'
import type { AgentSession } from '@/entities/agent-session'

type GaugeProps = { session: AgentSession; nowMs: number }

const CLOCK = 'elapsed'

export function Gauge({ session, nowMs }: GaugeProps) {
  const known = metrics.filter((metric) => metric.known(session))
  const clock = known.find((metric) => metric.id === CLOCK)
  const spent = known.filter((metric) => metric.id !== CLOCK)
  if (known.length === 0) return null
  const running = session.status === 'working' || session.status === 'waiting'

  return (
    <div data-gauge style={rootStyle}>
      <span style={spentStyle}>
        {spent.map((metric, at) => (
          <span key={metric.id} className={at === 0 ? undefined : '@max-[220px]:hidden'}>
            {at === 0 ? '' : ' · '}
            {metric.format(metric.read(session, nowMs))} {metric.label}
          </span>
        ))}
      </span>
      {clock !== undefined && (
        <span data-clock={running ? 'running' : 'settled'} style={clockStyle(running)}>
          {clock.format(clock.read(session, nowMs))}
        </span>
      )}
    </div>
  )
}

const rootStyle: CSSProperties = {
  containerType: 'inline-size',
  flex: '0 0 auto',
  marginTop: 12,
  paddingTop: 12,
  borderTop: '1px solid var(--color-border)',
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: 12,
  fontFamily: 'var(--zt-mono)',
  fontVariantNumeric: 'tabular-nums',
  fontSize: 11.5,
}

const spentStyle: CSSProperties = {
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  opacity: 0.5,
}

function clockStyle(running: boolean): CSSProperties {
  return { flex: '0 0 auto', opacity: running ? 1 : 0.5 }
}
