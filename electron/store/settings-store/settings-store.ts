import { readFile, rename } from 'node:fs/promises'
import { join } from 'node:path'
import { app } from 'electron'
import { readSettings } from '@/entities/agent-session/model/settings/settings'
import type { Settings } from '@/entities/agent-session/model/settings/settings.types'
import { wearTheme } from '../../shell/app-theme/app-theme'
import { handle } from '../../ipc/ipc'
import { queue } from '../queue/queue'
import { saveFile } from '../save-file/save-file'

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

// Startup wants the settings before there is a window to ask for them, so the
// read sits here on its own and the channel is only a way in.
export async function loadSettings(): Promise<Settings> {
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
}

export function registerSettingsStore(): void {
  handle('settings:read', (): Promise<Settings> => loadSettings())

  handle('settings:write', async (_event, next: unknown): Promise<Settings> => {
    const settings = readSettings(next)
    wearTheme(settings.theme)
    await queueWrite(settings)
    return settings
  })
}
