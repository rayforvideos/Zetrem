import { join } from 'node:path'
import { app } from 'electron'
import type { AgentDefDraft } from '@/entities/agent-def'
import { homedir } from 'node:os'
import { listAgentDefs, removeAgentDef, replaceAgentDef, writeAgentDef } from './agent-store/agent-store'
import { authoredAgents } from './authored-agents/authored-agents'
import { recallProject } from './project-memory/project-memory'
import { handle } from './ipc/ipc'

export function agentDir(): string {
  return join(app.getPath('userData'), 'agents')
}

export function registerAgentDefs(): void {
  handle('agents:list', () => listAgentDefs(agentDir()))
  handle('agents:write', (_event, draft: AgentDefDraft) => writeAgentDef(agentDir(), draft))
  handle('agents:remove', (_event, name: string) => removeAgentDef(agentDir(), name))
  handle('agents:authored', async (): Promise<string[]> =>
    authoredAgents(await recallProject(), homedir()),
  )
  handle('agents:replace', (_event, draft: AgentDefDraft, previousName: string) =>
    replaceAgentDef(agentDir(), draft, previousName),
  )
}
