import type { Remembered, SessionFacts } from './remembered.types'

// Two facts, learned from opposite runs.
//
// Which agents Claude Code has of its own can only be answered by asking it
// empty-handed: a session is handed our teammates and reports one flat list
// with theirs, and nothing in that list says which is which. So the agents are
// learned from a probe, which hands nothing over — its answer is theirs by
// construction, and there is nothing to work out afterwards.
//
// Which tools exist is the other way round: a probe runs a throwaway prompt and
// sees only part of the set, so tools are widened from real sessions instead.
export function remembered(
  session: SessionFacts,
  held: { tools: string[]; agents: string[] },
): Partial<Remembered> | null {
  const patch: Partial<Remembered> = {}
  const tools = session.probed ? null : widened(session.tools, held.tools)
  if (tools !== null) patch.knownTools = tools
  if (session.probed && fresh(session.agents, held.agents)) patch.knownAgents = session.agents
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
