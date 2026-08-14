import type { Remembered, SessionFacts } from './remembered.types'

export function remembered(
  session: SessionFacts,
  held: { tools: string[]; agents: string[] },
): Partial<Remembered> | null {
  const patch: Partial<Remembered> = {}
  if (fresh(session.tools, held.tools)) patch.knownTools = session.tools
  if (fresh(session.agents, held.agents)) patch.knownAgents = session.agents
  return Object.keys(patch).length === 0 ? null : patch
}

function fresh(seen: string[] | undefined, held: string[]): seen is string[] {
  if (seen === undefined || seen.length === 0) return false
  return seen.join(' ') !== held.join(' ')
}
