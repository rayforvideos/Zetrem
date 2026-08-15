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

export function saysItself(status: SessionStatus): boolean {
  return status !== 'waiting'
}

export function StateChip({ status }: { status: SessionStatus }) {
  if (saysItself(status)) return null
  return (
    <span data-state-chip={status} style={rootStyle}>
      {stateWord(status)}
    </span>
  )
}

const rootStyle: CSSProperties = {
  flex: '0 0 auto',
  fontSize: 11.5,
  whiteSpace: 'nowrap',
}
