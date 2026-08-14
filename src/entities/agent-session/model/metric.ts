import type { AgentSession } from './session'

export type Metric = {
  id: string
  label: string
  unit: string
  /** nowMs 를 인자로 받는다 — 시간을 읽는 지표도 순수 함수로 남기기 위해서다 */
  read(session: AgentSession, nowMs: number): number
  format(value: number): string
}
