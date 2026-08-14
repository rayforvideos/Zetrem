import type { CSSProperties } from 'react'
import { metrics } from '@/entities/agent-session'
import type { AgentSession } from '@/entities/agent-session'

type TelemetryProps = { session: AgentSession; nowMs: number }

/** 3층 — 유리 뒤에 깔리는 데이터 레이어. 초점을 맞추면 읽히고 아니면 질감이다 (스펙 §5.3) */
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

/**
 * 오른쪽 위에 선다. 아래에 두면 왼쪽에서 흘러온 2층과 같은 줄에서 겹쳐 읽힌다
 * (2026-08-13 실측: 명령줄 위에 숫자가 포개졌다). 3층은 유리 뒤라 겹치면 지저분하다
 */
const rootStyle: CSSProperties = {
  position: 'absolute',
  right: 20,
  top: 18,
  zIndex: 1,
  display: 'flex',
  gap: 16,
  // 밝기는 여기서 정하지 않는다. 표면이 얼마나 삼키는지 아는 것은 유리이고,
  // §5.3 의 25% 는 소스가 아니라 화면에 도달하는 값이므로 GlassPane 이 역산해 건다
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

const valueStyle: CSSProperties = { fontSize: 13 }
