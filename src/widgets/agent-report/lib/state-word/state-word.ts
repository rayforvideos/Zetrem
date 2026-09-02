import type { SessionStatus } from '@/entities/agent-session'
import { i18n } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import type { MessageDescriptor } from '@lingui/core'

// The report has room for a full sentence, so it says what the tile's own
// shorthand cannot: who the waiting is on.
const WORDS: Record<SessionStatus, MessageDescriptor> = {
  working: msg`Working`,
  waiting: msg`Waiting on you`,
  reported: msg`Reported back`,
  done: msg`Done`,
}

export function stateWord(status: SessionStatus): string {
  return i18n._(WORDS[status])
}
