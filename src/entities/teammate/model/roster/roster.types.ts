import type { Persona } from '../persona/persona.types'

export type RosterState = 'idle' | 'working' | 'waiting' | 'done'

export type RosterMember = {
  type: string
  persona: Persona
  state: RosterState
  note: string | null
  sessionId: string | null
}
