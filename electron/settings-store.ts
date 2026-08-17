import { readFile, rename } from 'node:fs/promises'
import { join } from 'node:path'
import { app } from 'electron'
import { readSettings } from '@/entities/agent-session/model/settings/settings'
import type { Settings } from '@/entities/agent-session/model/settings/settings.types'
import { handle } from './ipc/ipc'
import { queue } from './queue/queue'
import { saveFile } from './save-file/save-file'

function settingsPath(): string {
  return join(app.getPath('userData'), 'settings.json')
}

const queued = queue()

function queueWrite(settings: Settings): Promise<void> {
  return queued(() =>
    saveFile(settingsPath(), JSON.stringify(settings, null, 2)).catch((cause: unknown) =>
      console.error('could not save settings', cause),
    ),
  )
}

export function registerSettingsStore(): void {
  handle('settings:read', async (): Promise<Settings> => {
    let text: string
    try {
      text = await readFile(settingsPath(), 'utf8')
    } catch {
      return readSettings(null)
    }
    try {
      return readSettings(JSON.parse(text))
    } catch (cause: unknown) {
      const kept = `${settingsPath()}.broken`
      await rename(settingsPath(), kept).catch(() => undefined)
      console.error(`settings were unreadable, kept a copy at ${kept}`, cause)
      return readSettings(null)
    }
  })

  handle('settings:write', async (_event, next: unknown): Promise<Settings> => {
    const settings = readSettings(next)
    await queueWrite(settings)
    return settings
  })
}
