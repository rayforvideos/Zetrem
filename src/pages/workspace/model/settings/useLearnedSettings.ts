import { useEffect } from 'react'
import type { StatusState } from '@/entities/agent-session'
import type { Settings } from '@/entities/settings'
import { remembered } from '../chat/remembered/remembered'

export function useLearnedSettings(
  status: StatusState,
  settings: Settings,
  update: (patch: Partial<Settings>) => void,
): void {
  const probedSession = status.probed
  const sessionTools = status.session?.tools
  const sessionAgents = status.session?.agents
  // settings.stockAgents, defs and authored are deliberately not dependencies:
  // firing on those would overwrite the user's own stock-agent toggles.
  useEffect(() => {
    const learned = remembered(
      { tools: sessionTools, agents: sessionAgents, probed: probedSession },
      { tools: settings.knownTools, agents: settings.knownAgents },
    )
    if (learned === null) return
    update(learned)
  }, [
    probedSession,
    sessionTools,
    sessionAgents,
    settings.knownTools,
    settings.knownAgents,
    update,
  ])
}
