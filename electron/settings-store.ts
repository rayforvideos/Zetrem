import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { app } from 'electron'
import { readSettings } from '@/entities/agent-session/model/settings/settings'
import type { Settings } from '@/entities/agent-session/model/settings/settings.types'
import { handle } from './ipc/ipc'
import { saveFile } from './save-file/save-file'

function settingsPath(): string {
  return join(app.getPath('userData'), 'settings.json')
}

let writing: Promise<void> = Promise.resolve()

function queueWrite(settings: Settings): Promise<void> {
  writing = writing.then(() =>
    saveFile(settingsPath(), JSON.stringify(settings, null, 2)).catch((cause: unknown) =>
      console.error('could not save settings', cause),
    ),
  )
  return writing
}

export function registerSettingsStore(): void {
  handle('settings:read', async (): Promise<Settings> => {
    try {
      return readSettings(JSON.parse(await readFile(settingsPath(), 'utf8')))
    } catch {
      return readSettings(null)
    }
  })

  handle('settings:write', async (_event, next: unknown): Promise<Settings> => {
    const settings = readSettings(next)
    await queueWrite(settings)
    return settings
  })
}
