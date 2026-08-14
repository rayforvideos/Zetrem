import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { app, ipcMain } from 'electron'
import { readSettings } from '../src/entities/agent-session/model/settings'
import type { Settings } from '../src/entities/agent-session/model/settings'

function settingsPath(): string {
  return join(app.getPath('userData'), 'settings.json')
}

export function registerSettingsStore(): void {
  ipcMain.handle('settings:read', async (): Promise<Settings> => {
    try {
      return readSettings(JSON.parse(await readFile(settingsPath(), 'utf8')))
    } catch {
      return readSettings(null)
    }
  })

  ipcMain.handle('settings:write', async (_event, next: unknown): Promise<Settings> => {
    const settings = readSettings(next)
    await writeFile(settingsPath(), JSON.stringify(settings, null, 2), 'utf8').catch(
      (cause: unknown) => console.error('설정을 저장하지 못했다', cause),
    )
    return settings
  })
}
