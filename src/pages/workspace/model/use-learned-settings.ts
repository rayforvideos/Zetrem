import { useEffect } from 'react'
import type { Settings, StatusState } from '@/entities/agent-session'
import type { AgentDef } from '@/entities/agent-def'
import { learnedStock } from './learned-stock/learned-stock'
import { remembered } from './remembered/remembered'

// When a probe or session teaches us which tools and agents exist, fold that
// into settings once, and turn newly learned stock agents on for the user.
export function useLearnedSettings(
  status: StatusState,
  settings: Settings,
  defs: AgentDef[],
  authored: string[],
  update: (patch: Partial<Settings>) => void,
): void {
  const probedSession = status.probed
  const sessionTools = status.session?.tools
  const sessionAgents = status.session?.agents
  // settings.stockAgents, defs and authored are read but deliberately not
  // dependencies: this must fire only when the probe learns something new,
  // or it would overwrite the user's own stock-agent toggles.
  useEffect(() => {
    const learned = remembered(
      { tools: sessionTools, agents: sessionAgents, probed: probedSession },
      { tools: settings.knownTools, agents: settings.knownAgents },
    )
    const turnedOn =
      learned?.knownAgents === undefined
        ? null
        : learnedStock(
            learned.knownAgents,
            settings.knownAgents,
            settings.stockAgents,
            defs.map((def) => def.name),
            authored,
          )
    if (learned === null && turnedOn === null) return
    update({ ...learned, ...(turnedOn === null ? {} : { stockAgents: turnedOn }) })
  }, [probedSession, sessionTools, sessionAgents, settings.knownTools, settings.knownAgents, update])
}
