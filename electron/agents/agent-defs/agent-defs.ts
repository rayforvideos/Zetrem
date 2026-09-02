import { join } from 'node:path'
import { app, dialog } from 'electron'
import { READABLE, shortPath } from '@/entities/agent-def'
import type { AgentDefDraft, AgentSource } from '@/entities/agent-def'
import { homedir } from 'node:os'
import {
  readRoster,
  removeFromRoster,
  replaceInRoster,
  writeToRoster,
} from '../agent-roster/agent-roster'
import type { RosterDirs } from '../agent-roster/agent-roster.types'
import { projectKey } from '../project-key/project-key'
import { authoredAgents } from '../authored-agents/authored-agents'
import { recallProject } from '../../store/project-memory/project-memory'
import { handle } from '../../ipc/ipc'

// Both folders are the app's own. A teammate kept for one project still lives
// under userData, named by a hash of the project's path: nothing is written
// into the project, and nothing about it is shared with anyone.
async function rosterDirs(): Promise<RosterDirs> {
  const project = await recallProject()
  return {
    user: join(app.getPath('userData'), 'agents'),
    project:
      project === null
        ? null
        : join(app.getPath('userData'), 'project-agents', projectKey(project)),
  }
}

export function registerAgentDefs(): void {
  handle('agents:list', async () => readRoster(await rosterDirs()))
  handle('agents:write', async (_event, draft: AgentDefDraft) =>
    writeToRoster(await rosterDirs(), draft),
  )
  handle('agents:remove', async (_event, name: string, source: AgentSource) =>
    removeFromRoster(await rosterDirs(), name, source),
  )
  handle(
    'agents:authored',
    async (): Promise<string[]> => authoredAgents(await recallProject(), homedir()),
  )
  handle(
    'agents:replace',
    async (_event, draft: AgentDefDraft, previousName: string, previousSource: AgentSource) =>
      replaceInRoster(await rosterDirs(), draft, previousName, previousSource),
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
