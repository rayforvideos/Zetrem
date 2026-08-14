import { join } from 'node:path'
import { app, ipcMain } from 'electron'
import type { AgentDefDraft } from '../src/entities/agent-def'
import { listAgentDefs, writeAgentDef } from './agent-store'

export function agentDir(): string {
  return join(app.getPath('userData'), 'agents')
}

export function registerAgentDefs(): void {
  ipcMain.handle('agents:list', () => listAgentDefs(agentDir()))
  ipcMain.handle('agents:write', (_event, draft: AgentDefDraft) =>
    writeAgentDef(agentDir(), draft),
  )
}
