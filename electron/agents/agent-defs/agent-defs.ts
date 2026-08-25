import { join } from 'node:path'
import { app, dialog } from 'electron'
import { READABLE, shortPath } from '@/entities/agent-def'
import type { AgentDefDraft } from '@/entities/agent-def'
import { homedir } from 'node:os'
import { listAgentDefs, removeAgentDef, replaceAgentDef, writeAgentDef } from '../agent-store/agent-store'
import { authoredAgents } from '../authored-agents/authored-agents'
import { recallProject } from '../../store/project-memory/project-memory'
import { handle } from '../../ipc/ipc'

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
  handle('agents:pickKnowledge', async (): Promise<string[]> => {
    const project = await recallProject()
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      defaultPath: project ?? undefined,
      filters: [{ name: 'Notes', extensions: [...READABLE] }],
    })
    if (result.canceled) return []
    return result.filePaths.map((path) => shortPath(path, project))
  })
}
