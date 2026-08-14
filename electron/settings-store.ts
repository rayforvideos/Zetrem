import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { app, ipcMain } from 'electron'
import { readSettings } from '../src/entities/agent-session/model/settings'
import type { Settings } from '../src/entities/agent-session/model/settings'

/**
 * 사람이 고른 것을 파일 하나에 둔다.
 *
 * 렌더러가 직접 디스크를 만지지 않는 것이 이 앱의 규칙이라 여기가 그 창구다.
 * 되읽을 때 검증하는 것은 순수 모듈(model/settings.ts)이고 여기는 입출력만 한다.
 */
function settingsPath(): string {
  return join(app.getPath('userData'), 'settings.json')
}

export function registerSettingsStore(): void {
  ipcMain.handle('settings:read', async (): Promise<Settings> => {
    try {
      return readSettings(JSON.parse(await readFile(settingsPath(), 'utf8')))
    } catch {
      // 아직 없거나 못 읽으면 기본값이다 — 처음 켠 사람과 같은 자리에서 시작한다
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
