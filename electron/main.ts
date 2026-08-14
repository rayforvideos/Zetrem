import { resolve } from 'node:path'
import { BrowserWindow, app, dialog, ipcMain, shell } from 'electron'
import { CHROME_TOP, CONTROL_SYMBOL, GROUND, TRAFFIC_LIGHT } from '../src/shared/config/theme'
import { killAllAgents, registerAgentHost } from './agent-host'
import { registerAgentDefs } from './agent-defs'
import { registerAuth } from './auth'
import { registerCliVersion } from './cli-version'
import { registerSettingsStore } from './settings-store'
import { recallProject, rememberProject } from './project-memory'

const isMac = process.platform === 'darwin'

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    show: false,
    titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
    ...(isMac
      ? { trafficLightPosition: { x: TRAFFIC_LIGHT.x, y: TRAFFIC_LIGHT.y } }
      : {
          titleBarOverlay: {
            color: GROUND,
            symbolColor: CONTROL_SYMBOL,
            height: CHROME_TOP,
          },
        }),
    backgroundColor: GROUND,
    webPreferences: {
      preload: resolve(import.meta.dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  win.once('ready-to-show', () => win.show())

  win.webContents.on('will-navigate', (event, url) => {
    if (url !== win.webContents.getURL()) event.preventDefault()
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    win.webContents.on('console-message', (...args: unknown[]) => {
      const first = args[0] as { level?: string; message?: string } | undefined
      const level = typeof first?.level === 'string' ? first.level : String(args[1] ?? '')
      const message = typeof first?.message === 'string' ? first.message : String(args[2] ?? '')
      if (level === 'error' || level === 'warning' || level === '2' || level === '3') {
        console.error(`[renderer] ${message}`)
      }
    })
    win.webContents.on('render-process-gone', (_event, details) => {
      console.error('[renderer] crashed', details.reason)
    })
  }

  const devUrl = process.env.ELECTRON_RENDERER_URL
  if (devUrl) {
    win.loadURL(devUrl)
  } else {
    win.loadFile(resolve(import.meta.dirname, '../renderer/index.html'))
  }
}

ipcMain.handle('project:pick', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
  const path = result.canceled ? undefined : result.filePaths[0]
  if (!path) return null
  await rememberProject(path)
  return path
})

ipcMain.handle('project:restore', () => recallProject())

const primary = app.requestSingleInstanceLock()
if (!primary) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const [existing] = BrowserWindow.getAllWindows()
    if (existing) {
      if (existing.isMinimized()) existing.restore()
      existing.focus()
    }
  })

  registerAgentHost()
  registerAuth()
  registerAgentDefs()
  registerCliVersion()
  registerSettingsStore()

  app.whenReady().then(() => {
    createWindow()
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    killAllAgents()
    if (process.platform !== 'darwin') app.quit()
  })
}
