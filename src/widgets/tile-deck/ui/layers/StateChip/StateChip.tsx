import type { CSSProperties } from 'react'
import type { SessionStatus } from '@/entities/agent-session'
import { chipWord } from '../../../lib/state-word/state-word'

export function StateChip({
  status,
  held = false,
}: {
  status: SessionStatus
  // The orchestrator this teammate reports to has stopped for the person, so
  // nothing this teammate hands back moves until the person answers.
  held?: boolean
}) {
  const word = chipWord(status, held)
  if (word === null) return null
  return (
    <span
      data-state-chip={status}
      data-held={held && status === 'working' ? '' : undefined}
      style={rootStyle}
    >
      {word}
    </span>
  )
}

const rootStyle: CSSProperties = {
  flex: '0 0 auto',
  fontSize: 11.5,
  whiteSpace: 'nowrap',
}
