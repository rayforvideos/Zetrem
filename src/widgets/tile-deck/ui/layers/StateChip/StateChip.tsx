import type { CSSProperties } from 'react'
import type { SessionStatus } from '@/entities/agent-session'
import { saysItself, stateWord } from '../../../lib/state-word/state-word'

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
