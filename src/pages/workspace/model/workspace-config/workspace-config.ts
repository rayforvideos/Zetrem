import { ORCHESTRATOR, allowedStock, stockAgents } from '@/entities/agent-session'
import type { Crew, Person, RosterLock, Settings } from '@/entities/agent-session'
import type { AgentDef } from '@/entities/agent-def'

export function peopleOf(defs: AgentDef[]): Person[] {
  return defs.map((def) => ({
    name: def.name,
    description: def.description,
    prompt: def.prompt,
    model: def.model,
  }))
}

export function crewOf(defs: AgentDef[], sessionModel: string | null): Crew {
  return {
    members: Object.fromEntries(
      defs.map((def) => [def.name, { character: def.character, model: def.model }]),
    ),
    fallbackModel: sessionModel,
  }
}

export function lockOf(settings: Settings, defs: AgentDef[]): RosterLock {
  const ourNames = defs.map((def) => def.name)
  const stock = stockAgents(settings.knownAgents, ourNames)
  const callable = new Set([...ourNames, ...allowedStock(stock, settings.stockAgents)])
  return {
    blockedAgents: settings.knownAgents.filter(
      (name) => name.length > 0 && name !== ORCHESTRATOR && !callable.has(name),
    ),
  }
}

export function pluginSummary(installed: number, sources: number): string {
  if (installed === 0 && sources === 0) return 'Add a marketplace to bring in skills and agents'
  return `${installed} installed from ${sources} ${sources === 1 ? 'source' : 'sources'}`
}
