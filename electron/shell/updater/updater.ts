import { app, BrowserWindow } from 'electron'
// electron-updater is CommonJS and stays external to the main bundle, so a
// named import fails at load time in the packaged ESM main. Only the default
// import survives both.
import updater from 'electron-updater'
import { handle, push } from '../../ipc/ipc'

const { autoUpdater } = updater

// Roughly a workday between checks; the launch check covers most sessions.
const RECHECK_MS = 4 * 60 * 60 * 1000

let readyVersion: string | null = null
let registered = false

export function registerUpdater(): void {
  // A second call would stack another download listener and another clock on top
  // of the first, so the first one is the only one.
  if (registered) return
  registered = true

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
      push(win.webContents, 'updater:ready', info.version)
    }
  })

  const check = (): void => {
    autoUpdater.checkForUpdates().catch(() => {
      // Offline or GitHub down; the next interval will try again.
    })
  }

  void app.whenReady().then(() => {
    check()
    // The recheck clock is no reason to hold the process open at quit.
    setInterval(check, RECHECK_MS).unref()
  })
}
