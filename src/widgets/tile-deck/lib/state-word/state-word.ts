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

export function stateWord(status: SessionStatus): string {
  return i18n._(WORDS[status])
}

export function saysItself(status: SessionStatus): boolean {
  return status !== 'waiting'
}
