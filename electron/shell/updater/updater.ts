import { app, BrowserWindow } from 'electron'
// electron-updater is CJS and stays external to the main bundle: only the
// default import survives in the packaged ESM main.
import updater from 'electron-updater'
import { handle, push } from '../../ipc/ipc'
import { isPackagedRun } from '../packaged/packaged'

const { autoUpdater } = updater

const RECHECK_MS = 4 * 60 * 60 * 1000
const FIRST_CHECK_MS = 10 * 1000

let readyVersion: string | null = null
let registered = false

export function registerUpdater(): void {
  if (registered) return
  registered = true

  handle('updater:state', () => readyVersion)
  handle('updater:restart', () => {
    autoUpdater.quitAndInstall()
  })

  // electron-updater reads app-update.yml, which only a packaged build has.
  if (!isPackagedRun()) return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  // Every Zetrem release so far is a semver prerelease (1.0.0-beta.n).
  autoUpdater.allowPrerelease = true
  autoUpdater.allowDowngrade = false

  autoUpdater.on('update-downloaded', (info) => {
    readyVersion = info.version
    for (const win of BrowserWindow.getAllWindows()) {
      push(win.webContents, 'updater:ready', info.version)
    }
  })

  const check = (): void => {
    autoUpdater.checkForUpdates().catch(() => {
      // Offline or GitHub down; the next interval tries again.
    })
  }

  void app.whenReady().then(() => {
    setTimeout(check, FIRST_CHECK_MS).unref()
    setInterval(check, RECHECK_MS).unref()
  })
}
