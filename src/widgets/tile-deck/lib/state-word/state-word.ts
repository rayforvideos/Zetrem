import type { SessionStatus } from '@/entities/agent-session'
import { i18n } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import type { MessageDescriptor } from '@lingui/core'

const WORDS: Record<SessionStatus, MessageDescriptor> = {
  working: msg`Working`,
  waiting: msg`Needs you`,
  reported: msg`Reported back`,
  done: msg`Done`,
}

const HELD = msg`Waiting on you`

export function stateWord(status: SessionStatus): string {
  return i18n._(WORDS[status])
}

export function saysItself(status: SessionStatus): boolean {
  return status !== 'waiting'
}

// What the chip beside a teammate's name says. A teammate whose orchestrator
// has stopped for the person is still working as far as its own run goes, and
// nothing about that run has changed; what it is really waiting on has, and
// that is worth saying without rewriting what the teammate is.
export function chipWord(status: SessionStatus, held: boolean): string | null {
  if (held && status === 'working') return i18n._(HELD)
  return saysItself(status) ? null : stateWord(status)
}
