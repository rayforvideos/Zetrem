import { app, BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'
import { handle } from '../ipc/ipc'

// Roughly a workday between checks; the launch check covers most sessions.
const RECHECK_MS = 4 * 60 * 60 * 1000

let readyVersion: string | null = null

export function registerUpdater(): void {
  // The renderer may mount (or remount) after update-downloaded fired, so the
  // ready version is also answerable on demand, not only pushed.
  handle('updater:state', () => readyVersion)
  handle('updater:restart', () => {
    autoUpdater.quitAndInstall()
  })

  // electron-updater reads app-update.yml, which only exists in a packaged
  // build; in dev the check would just error into the log every launch.
  if (!app.isPackaged) return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  // Every Zetrem release so far is a semver prerelease (1.0.0-beta.n).
  autoUpdater.allowPrerelease = true

  autoUpdater.on('update-downloaded', (info) => {
    readyVersion = info.version
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('updater:ready', info.version)
    }
  })

  const check = (): void => {
    autoUpdater.checkForUpdates().catch(() => {
      // Offline or GitHub down; the next interval will try again.
    })
  }

  void app.whenReady().then(() => {
    check()
    setInterval(check, RECHECK_MS)
  })
}
