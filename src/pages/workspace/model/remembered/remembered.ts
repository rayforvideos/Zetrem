import type { Remembered, SessionFacts } from './remembered.types'

export function remembered(
  session: SessionFacts,
  held: { tools: string[]; agents: string[] },
): Partial<Remembered> | null {
  const patch: Partial<Remembered> = {}
  const tools = session.probed ? null : widened(session.tools, held.tools)
  if (tools !== null) patch.knownTools = tools
  if (fresh(session.agents, held.agents)) patch.knownAgents = session.agents
  return Object.keys(patch).length === 0 ? null : patch
}

function widened(seen: string[] | undefined, held: string[]): string[] | null {
  if (seen === undefined || seen.length === 0) return null
  const added = seen.filter((name) => !held.includes(name))
  return added.length === 0 ? null : [...held, ...added]
}

function fresh(seen: string[] | undefined, held: string[]): seen is string[] {
  if (seen === undefined || seen.length === 0) return false
  return seen.join(' ') !== held.join(' ')
}
