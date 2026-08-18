import { ORCHESTRATOR, allowedStock, stockAgents } from '@/entities/agent-session'
import type { Crew, Person, RosterLock, Settings } from '@/entities/agent-session'
import { briefOf } from '@/entities/agent-def'
import type { AgentDef } from '@/entities/agent-def'
import { plural, t } from '@lingui/core/macro'

export function peopleOf(defs: AgentDef[]): Person[] {
  return defs.map((def) => ({
    name: def.name,
    description: def.description,
    prompt: briefOf(def.prompt, def.knowledge),
    model: def.model,
    tools: def.tools,
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

export function lockOf(settings: Settings, defs: AgentDef[], authored: string[] = []): RosterLock {
  const ourNames = defs.map((def) => def.name)
  const stock = stockAgents(settings.knownAgents, ourNames, authored)
  const callable = new Set([...ourNames, ...allowedStock(stock, settings.stockAgents)])
  return {
    blockedAgents: settings.knownAgents.filter(
      (name) => name.length > 0 && name !== ORCHESTRATOR && !callable.has(name),
    ),
  }
}

export function pluginSummary(installed: number, sources: number): string {
  if (installed === 0 && sources === 0) return t`Add a marketplace to bring in skills and agents`
  return t`${installed} installed from ${plural(sources, { one: '# source', other: '# sources' })}`
}
