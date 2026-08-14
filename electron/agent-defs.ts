import { join } from 'node:path'
import { app } from 'electron'
import type { AgentDefDraft } from '../src/entities/agent-def'
import { listAgentDefs, writeAgentDef } from './agent-store/agent-store'
import { handle } from './ipc/ipc'

export function agentDir(): string {
  return join(app.getPath('userData'), 'agents')
}

export function registerAgentDefs(): void {
  handle('agents:list', () => listAgentDefs(agentDir()))
  handle('agents:write', (_event, draft: AgentDefDraft) =>
    writeAgentDef(agentDir(), draft),
  )
}
