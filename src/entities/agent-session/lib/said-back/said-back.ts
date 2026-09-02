import type { AgentSession } from '../../model/session/session.types'

// Whether a session's headline is its own words yet. A subagent starts out
// carrying the prompt it was handed — "You are working in the directory …" —
// as its headline, and only the CLI's final summary replaces it. Until then
// the headline says nothing about the run, and what the agent was called in
// for is the truer line to show.
export function saidBack(session: AgentSession): boolean {
  return session.status === 'reported' || session.status === 'done'
}
