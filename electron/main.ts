import { resolve } from 'node:path'
import { BrowserWindow, Menu, app, dialog, session, shell } from 'electron'
import { CHROME_TOP, MIN_WINDOW, TRAFFIC_LIGHT } from '@/shared/config/theme'
import { killAllAgents, registerAgentHost } from './host/agent-host/agent-host'
import { chromeNow, followScheme, wearTheme } from './shell/app-theme/app-theme'
import { registerAttachments } from './shell/attachments/attachments'
import { registerAgentDefs } from './agents/agent-defs/agent-defs'
import { registerAuth } from './cli/auth/auth'
import { registerCliInstall } from './cli/cli-install/cli-install'
import { registerCliVersion } from './cli/cli-version/cli-version'
import { registerNudge } from './host/nudge/nudge'
import { registerPlugins } from './catalog/plugins/plugins'
import { loadSettings, registerSettingsStore } from './store/settings-store/settings-store'
import { readLoginPath, saveLoginPath } from './store/login-path-store/login-path-store'
import { rememberLoginPath } from './cli/login-path/login-path'
import { registerConnectors } from './catalog/connectors/connectors'
import { killTrackedChildren } from './spawn/run-settled/run-settled'
import { killAllProbes, registerSessionProbe } from './host/session-probe/session-probe'
import { registerTranscriptStore } from './store/transcript-store/transcript-store'
import { registerUpdater } from './shell/updater/updater'
import { registerProjects } from './projects/projects'
import { closeLibraryMcp, registerLibrary, stopFollowing } from './library/library'
import { collapseCategories } from './projects/collapse/collapse'
import { handle } from './ipc/ipc'
import { loadTroubleLine, troublePage } from './shell/window-trouble/window-trouble'
import { isPackagedRun } from './shell/packaged/packaged'

const isMac = process.platform === 'darwin'

app.setName('Zetrem')
if (!isMac) Menu.setApplicationMenu(null)

function dropChildren(): void {
  killAllAgents()
  killAllProbes()
  killTrackedChildren()
}

const inspectPort = isPackagedRun()
  ? null
  : (process.env.ZT_INSPECT ?? (process.env.ELECTRON_RENDERER_URL ? '0' : null))
if (inspectPort !== null) app.commandLine.appendSwitch('remote-debugging-port', inspectPort)

function wearTheName(): void {
  app.setAboutPanelOptions({
    applicationName: 'Zetrem',
    applicationVersion: app.getVersion(),
    version: '',
    copyright: 'Runs on Claude Code',
  })
}

// Parsed rather than prefix-matched: the browser reads the string the same way.
function openIfExternal(url: string): void {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return
  }
  if (parsed.protocol === 'https:') void shell.openExternal(parsed.href)
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

  // did-finish-load fires for a failed navigation too, still naming the page
  // that was asked for, so the failure has to be remembered until the next one.
  let loadFailed = false

  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription, _url, isMainFrame) => {
    if (!isMainFrame) return
    const line = loadTroubleLine(errorCode, errorDescription)
    if (line === null) return
    loadFailed = true
    console.error(`[window] ${line}`)
    win.show()
    void win.webContents.loadURL(troublePage(line))
  })

  // The one line the packaging job looks for: a process that stays alive can
  // still be showing the trouble page, and that page is a data: URL.
  win.webContents.on('did-finish-load', () => {
    const url = win.webContents.getURL()
    if (loadFailed || url.startsWith('data:')) return
    console.log(`[window] showing ${url}`)
  })

  win.webContents.on('did-start-navigation', (details) => {
    if (!details.isMainFrame) return
    if (details.isSameDocument) return
    if (!details.url.startsWith('data:')) loadFailed = false
    // A clicked link lands here before will-navigate cancels it, and the page
    // is staying, so only a load that really replaces it drops the agents.
    if (details.url !== win.webContents.getURL() && !details.url.startsWith('data:')) return
    dropChildren()
  })

  win.webContents.on('render-process-gone', (_event, details) => {
    console.error('[renderer] crashed', details.reason)
    if (details.reason === 'clean-exit' || win.isDestroyed()) return
    win.show()
    void win.webContents.loadURL(troublePage(`The screen stopped: ${details.reason}`))
  })

  win.webContents.on('will-navigate', (event, url) => {
    if (url === win.webContents.getURL()) return
    event.preventDefault()
    openIfExternal(url)
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    openIfExternal(url)
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

// 'unsafe-inline' for styles: Tailwind writes a style element and the
// components carry inline style attributes.
const POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "media-src 'self' blob:",
  "connect-src 'self'",
  "object-src 'none'",
  "frame-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ')

// The dev server needs its own websocket and an eval to hot-reload.
function guardThePage(): void {
  if (process.env.ELECTRON_RENDERER_URL) return
  session.defaultSession.webRequest.onHeadersReceived((details, done) => {
    done({
      responseHeaders: { ...details.responseHeaders, 'Content-Security-Policy': [POLICY] },
    })
  })
}

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
  registerCliInstall()
  registerSettingsStore()
  registerConnectors()
  registerSessionProbe()
  registerTranscriptStore()
  registerPlugins()
  registerProjects()
  registerLibrary()
  registerNudge()
  registerUpdater()
  handle('app:version', () => app.getVersion())

  app
    .whenReady()
    .then(async () => {
      session.defaultSession.setPermissionRequestHandler((_contents, _permission, grant) =>
        grant(false),
      )
      session.defaultSession.setPermissionCheckHandler(() => false)
      guardThePage()
      wearTheName()
      await collapseCategories(app.getPath('userData'))
      rememberLoginPath(await readLoginPath(), saveLoginPath)
      // Settled before the window exists, or the first paint is the wrong
      // colour and the page opens under the machine's scheme.
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

  app.on('before-quit', () => {
    dropChildren()
    stopFollowing()
    void closeLibraryMcp()
  })

  process.on('uncaughtException', (cause) => {
    console.error('[zetrem] main crashed', cause)
    dropChildren()
    app.exit(1)
  })

  process.on('unhandledRejection', (cause) => {
    console.error('[zetrem] a promise was dropped', cause)
  })
}
