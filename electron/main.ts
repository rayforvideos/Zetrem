import { relative, resolve } from 'node:path'
import { BrowserWindow, app, dialog, session, shell } from 'electron'
import { CHROME_TOP, MIN_WINDOW, TRAFFIC_LIGHT } from '@/shared/config/theme'
import { killAllAgents, registerAgentHost } from './agent-host/agent-host'
import { chromeNow, followScheme, wearTheme } from './app-theme/app-theme'
import { registerAttachments } from './attachments/attachments'
import { registerAgentDefs } from './agent-defs'
import { registerAuth } from './auth'
import { registerCliVersion } from './cli-version'
import { registerNudge } from './nudge'
import { registerPlugins } from './plugins'
import { loadSettings, registerSettingsStore } from './settings-store'
import { registerConnectors } from './connectors'
import { killAllProbes, registerSessionProbe } from './session-probe'
import { registerTranscriptStore } from './transcript-store'
import { recallProject, rememberProject } from './project-memory'
import { handle } from './ipc/ipc'
import { loadTroubleLine, troublePage } from './window-trouble/window-trouble'

const isMac = process.platform === 'darwin'

app.setName('Zetrem')

function dropChildren(): void {
  killAllAgents()
  killAllProbes()
}

const inspectPort = process.env.ZT_INSPECT ?? (process.env.ELECTRON_RENDERER_URL ? '0' : null)
if (inspectPort !== null) app.commandLine.appendSwitch('remote-debugging-port', inspectPort)

function wearTheName(): void {
  app.setAboutPanelOptions({
    applicationName: 'Zetrem',
    applicationVersion: app.getVersion(),
    version: '',
    copyright: 'Runs on Claude Code',
  })
}

function createWindow(): void {
  const skin = chromeNow()
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: MIN_WINDOW.width,
    minHeight: MIN_WINDOW.height,
    show: false,
    titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
    ...(isMac
      ? { trafficLightPosition: { x: TRAFFIC_LIGHT.x, y: TRAFFIC_LIGHT.y } }
      : {
          titleBarOverlay: {
            color: skin.ground,
            symbolColor: skin.symbol,
            height: CHROME_TOP,
          },
        }),
    backgroundColor: skin.ground,
    webPreferences: {
      preload: resolve(import.meta.dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
      sandbox: true,
    },
  })

  followScheme(win)

  win.once('ready-to-show', () => win.show())

  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription, _url, isMainFrame) => {
    if (!isMainFrame) return
    const line = loadTroubleLine(errorCode, errorDescription)
    if (line === null) return
    console.error(`[window] ${line}`)
    win.show()
    void win.webContents.loadURL(troublePage(line))
  })

  win.webContents.on('did-start-navigation', (details) => {
    if (!details.isMainFrame) return
    // In-page navigation (hash change, pushState) is not a real page load, so don't kill agents for it.
    if (details.isSameDocument) return
    dropChildren()
  })

  win.webContents.on('render-process-gone', (_event, details) => {
    console.error('[renderer] crashed', details.reason)
    if (details.reason === 'clean-exit' || win.isDestroyed()) return
    win.show()
    void win.webContents.loadURL(troublePage(`The screen stopped: ${details.reason}`))
  })

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
  }

  const devUrl = process.env.ELECTRON_RENDERER_URL
  const loading = devUrl
    ? win.loadURL(devUrl)
    : win.loadFile(resolve(import.meta.dirname, '../renderer/index.html'))
  void loading.catch(() => undefined)
}

handle('project:pick', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
  const path = result.canceled ? undefined : result.filePaths[0]
  if (!path) return null
  await rememberProject(path)
  return path
})

handle('project:restore', () => recallProject())

handle('agents:pickKnowledge', async (): Promise<string[]> => {
  const project = await recallProject()
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    defaultPath: project ?? undefined,
    filters: [{ name: 'Notes', extensions: ['md', 'mdx', 'txt', 'json', 'yaml', 'yml'] }],
  })
  if (result.canceled) return []
  return result.filePaths.map((path) => (project ? relative(project, path) : path))
})

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
  registerAttachments()
  registerAuth()
  registerAgentDefs()
  registerCliVersion()
  registerSettingsStore()
  registerConnectors()
  registerSessionProbe()
  registerTranscriptStore()
  registerPlugins()
  registerNudge()
  handle('app:version', () => app.getVersion())

  app
    .whenReady()
    .then(async () => {
      session.defaultSession.setPermissionRequestHandler((_contents, _permission, grant) =>
        grant(false),
      )
      session.defaultSession.setPermissionCheckHandler(() => false)
      wearTheName()
      // The scheme has to be settled before the window exists, or the first paint
      // is the wrong colour and the page opens under the machine's scheme.
      wearTheme((await loadSettings()).theme)
      createWindow()
      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
      })
    })
    .catch((cause: unknown) => {
      console.error('[zetrem] could not start', cause)
      dialog.showErrorBox('Zetrem could not start', String(cause))
      app.exit(1)
    })

  app.on('window-all-closed', () => {
    dropChildren()
    if (!isMac) app.quit()
  })

  app.on('before-quit', dropChildren)

  process.on('uncaughtException', (cause) => {
    console.error('[zetrem] main crashed', cause)
    dropChildren()
    app.exit(1)
  })

  process.on('unhandledRejection', (cause) => {
    console.error('[zetrem] a promise was dropped', cause)
  })
}
