import type { CSSProperties } from 'react'
import type { SessionStatus } from '@/entities/agent-session'

const WORDS: Record<SessionStatus, string> = {
  working: 'Working',
  waiting: 'Needs you',
  reported: 'Reported back',
  done: 'Done',
}

export function stateWord(status: SessionStatus): string {
  return WORDS[status]
}

export function StateChip({ status }: { status: SessionStatus }) {
  return (
    <span data-state-chip={status} style={rootStyle}>
      <span style={dotStyle(status)} />
      {stateWord(status)}
    </span>
  )
}

function dotStyle(status: SessionStatus): CSSProperties {
  const base: CSSProperties = { width: 5, height: 5, borderRadius: 3, flex: '0 0 auto' }
  switch (status) {
    case 'working':
      return { ...base, background: 'currentColor', animation: 'zt-pulse 1.6s ease-in-out infinite' }
    case 'waiting':
      return { ...base, border: '1.5px solid currentColor' }
    case 'reported':
    case 'done':
      return { ...base, background: 'currentColor', opacity: 0.4 }
  }
}

const rootStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  flex: '0 0 auto',
  fontSize: 10.5,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
}
