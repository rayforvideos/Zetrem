import type { MessageDescriptor } from '@lingui/core'
import type { AgentSession } from '../../model/session/session.types'

export type Metric = {
  id: string
  label: MessageDescriptor
  unit: string
  known(session: AgentSession): boolean
  read(session: AgentSession, nowMs: number): number
  format(value: number): string
}
