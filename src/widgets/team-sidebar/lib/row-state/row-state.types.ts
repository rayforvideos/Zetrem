import type { RosterState } from '@/entities/teammate'

export type RowState = {
  state: RosterState
  now: string | null
  lit: boolean
  open: string | null
}
