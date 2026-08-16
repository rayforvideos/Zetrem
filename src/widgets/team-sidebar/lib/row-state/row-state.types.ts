import type { RosterState } from '@/entities/agent-session'

export type RowState = {
  state: RosterState
  now: string | null
  lit: boolean
  open: string | null
}
