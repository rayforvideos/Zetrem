import { app, BrowserWindow } from 'electron'
// electron-updater is CJS and stays external to the main bundle: only the
// default import survives in the packaged ESM main.
import updater from 'electron-updater'
import { handle, push } from '../../ipc/ipc'
import { logLine } from '../app-log/app-log'
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
  // Checking by hand answers right away with where things stand; a download
  // that starts here still announces itself through updater:ready when done.
  handle('updater:check', async () => {
    if (!isPackagedRun()) return { state: 'dev' as const }
    if (readyVersion !== null) return { state: 'ready' as const, version: readyVersion }
    try {
      const found = await autoUpdater.checkForUpdates()
      if (found === null) return { state: 'dev' as const }
      if (found.downloadPromise !== null && found.downloadPromise !== undefined) {
        logLine('updater', `asked by hand: found ${found.updateInfo.version}, downloading`)
        return { state: 'downloading' as const, version: found.updateInfo.version }
      }
      logLine('updater', 'asked by hand: nothing newer')
      return { state: 'latest' as const }
    } catch (cause: unknown) {
      const said = cause instanceof Error ? cause.message : String(cause)
      logLine('updater', `asked by hand, trouble: ${said}`)
      return { state: 'trouble' as const, said }
    }
  })

  // electron-updater reads app-update.yml, which only a packaged build has.
  if (!isPackagedRun()) return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  // Every Zetrem release so far is a semver prerelease (1.0.0-beta.n).
  autoUpdater.allowPrerelease = true
  autoUpdater.allowDowngrade = false

  autoUpdater.on('error', (cause) => {
    logLine('updater', `trouble: ${cause instanceof Error ? cause.message : String(cause)}`)
  })
  autoUpdater.on('update-available', (info) => {
    logLine('updater', `found ${info.version}, downloading`)
  })
  autoUpdater.on('update-not-available', (info) => {
    logLine('updater', `nothing newer than ${info.version}`)
  })
  autoUpdater.on('update-downloaded', (info) => {
    logLine('updater', `downloaded ${info.version}`)
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
