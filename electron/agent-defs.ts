import { join } from 'node:path'
import { app } from 'electron'
import type { AgentDefDraft } from '../src/entities/agent-def'
import {
  listAgentDefs,
  removeAgentDef,
  replaceAgentDef,
  writeAgentDef,
} from './agent-store/agent-store'
import { handle } from './ipc/ipc'

export function agentDir(): string {
  return join(app.getPath('userData'), 'agents')
}

export function registerAgentDefs(): void {
  handle('agents:list', () => listAgentDefs(agentDir()))
  handle('agents:write', (_event, draft: AgentDefDraft) => writeAgentDef(agentDir(), draft))
  handle('agents:remove', (_event, name: string) => removeAgentDef(agentDir(), name))
  handle('agents:replace', (_event, draft: AgentDefDraft, previousName: string) =>
    replaceAgentDef(agentDir(), draft, previousName),
  )
}
