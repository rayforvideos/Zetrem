import { resolve } from 'node:path'
import { BrowserWindow, app, dialog, ipcMain } from 'electron'
import { GROUND, TRAFFIC_LIGHT } from '../src/shared/config/theme'
import { killAllAgents, registerAgentHost } from './agent-host'
import { registerAgentDefs } from './agent-defs'
import { registerAuth } from './auth'
import { registerCliVersion } from './cli-version'
import { registerSettingsStore } from './settings-store'
import { recallProject, rememberProject } from './project-memory'

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    show: false,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: TRAFFIC_LIGHT.x, y: TRAFFIC_LIGHT.y },
    backgroundColor: GROUND,
    webPreferences: {
      preload: resolve(import.meta.dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  win.once('ready-to-show', () => win.show())

  // 렌더러의 콘솔은 앱 창 안에만 남아 터미널에서 안 보인다 — 개발 중에는 끌어와야
  // 화면이 하얗게 죽은 이유를 볼 수 있다.
  if (process.env.ELECTRON_RENDERER_URL) {
    // Electron 버전마다 인자 모양이 다르다 — 객체 하나로 오기도 하고 (level, message, line, source) 로 오기도 한다
    win.webContents.on('console-message', (...args: unknown[]) => {
      const first = args[0] as { level?: string; message?: string } | undefined
      const level = typeof first?.level === 'string' ? first.level : String(args[1] ?? '')
      const message = typeof first?.message === 'string' ? first.message : String(args[2] ?? '')
      if (level === 'error' || level === 'warning' || level === '2' || level === '3') {
        console.error(`[renderer] ${message}`)
      }
    })
    win.webContents.on('render-process-gone', (_event, details) => {
      console.error('[renderer] 죽었다', details.reason)
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

// 락을 못 얻으면 여기서 끝난다. 예전에는 quit() 만 부르고 그 아래 초기화를 계속해서,
// 이미 도는 앱(때로는 부모가 죽고 남은 좀비)이 있으면 새 창이 뜨지도 않고 조용히 사라졌다.
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
