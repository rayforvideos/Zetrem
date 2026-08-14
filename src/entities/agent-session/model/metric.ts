import type { AgentSession } from './session.types'

export type Metric = {
  id: string
  label: string
  unit: string
  read(session: AgentSession, nowMs: number): number
  format(value: number): string
}
