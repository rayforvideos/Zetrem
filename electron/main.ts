import { readFile, writeFile } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'
import { BrowserWindow, app, dialog, ipcMain } from 'electron'
import { killAllAgents, registerAgentHost } from './agent-host'
import { registerAuth } from './auth'
import { registerCliVersion } from './cli-version'
import { registerSettingsStore } from './settings-store'
import { recallProject, rememberProject } from './project-memory'

/**
 * 확장자 → MIME. `blob:` 을 만들 때 타입이 없으면 디코더를 고르지 못한다.
 * 다이얼로그 필터도 이 목록에서 나온다 — 열 수 있는 것과 읽을 수 있는 것을 같게 유지한다.
 */
const IMAGE_MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
}

function createWindow(): void {
  const win = new BrowserWindow({
    // 16:10 노트북 작업 영역에 여백까지 들어가는 최소 크기.
    // 이보다 좁으면 타일 6개 격자에서 한 칸이 2층 스트리밍을 담지 못한다 (스펙 §2.2, §5.2)
    width: 1440,
    height: 900,
    // 사용자 배경이 창 전체를 채우는 레이어이므로 창 자체가 투명해야 한다 (스펙 §6.5)
    transparent: true,
    frame: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: resolve(import.meta.dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      // 샌드박스를 켠 채로 두므로 preload 는 CJS 여야 한다 (electron.vite.config.ts 참고).
      // 우리가 preload 에서 쓰는 것은 contextBridge 와 ipcRenderer 뿐이라 샌드박스로 충분하다
      sandbox: true,
    },
  })

  const devUrl = process.env.ELECTRON_RENDERER_URL
  if (devUrl) {
    win.loadURL(devUrl)
  } else {
    win.loadFile(resolve(import.meta.dirname, '../renderer/index.html'))
  }
}

/**
 * 다이얼로그를 열고 고른 파일을 바이트째로 돌려준다.
 * 경로를 돌려주면 렌더러가 `file://` 을 만들어야 하는데, 개발 서버(http 오리진)에서는
 * Chromium 이 그것을 차단한다. 자세한 근거는 src/shared/api/desk.ts 참고.
 */
/** 마지막 배경의 경로를 기억하는 파일. bytes 를 복사하지 않고 원본 경로만 적는다 */
function backdropMemoryPath(): string {
  return join(app.getPath('userData'), 'backdrop.json')
}

async function readImage(path: string): Promise<{ bytes: Uint8Array; mime: string } | null> {
  const mime = IMAGE_MIME[extname(path).toLowerCase()]
  if (!mime) return null
  // Buffer 그대로 넘기면 렌더러에서 형태가 Uint8Array 로 바뀐다. 계약을 눈에 보이게 적는다
  return { bytes: new Uint8Array(await readFile(path)), mime }
}

ipcMain.handle('backdrop:pick', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: '이미지', extensions: [...new Set(Object.keys(IMAGE_MIME).map((e) => e.slice(1)))] },
    ],
  })
  const path = result.canceled ? undefined : result.filePaths[0]
  if (!path) return null

  const image = await readImage(path)
  if (!image) throw new Error(`읽을 수 없는 이미지 형식이다: ${extname(path) || path}`)
  // 성공한 선택만 기억한다 — 실패한 경로를 적으면 다음 시작마다 같은 실패를 되풀이한다
  await writeFile(backdropMemoryPath(), JSON.stringify({ path }), 'utf8').catch(() => undefined)
  return image
})

ipcMain.handle('project:pick', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
  const path = result.canceled ? undefined : result.filePaths[0]
  if (!path) return null
  await rememberProject(path)
  return path
})

ipcMain.handle('project:restore', () => recallProject())

ipcMain.handle('backdrop:restore', async () => {
  try {
    const memory = JSON.parse(await readFile(backdropMemoryPath(), 'utf8')) as { path?: string }
    if (typeof memory.path !== 'string') return null
    return await readImage(memory.path)
  } catch {
    // 기억이 없거나 파일이 사라진 것은 오류가 아니다 — 폴백 그라디언트로 시작하면 된다
    return null
  }
})

// 프레임리스 창이라 OS 가 닫기 버튼을 주지 않는다 — 커스텀 타이틀바가 이 창구를 쓴다 (스펙 §6.5)
ipcMain.on('window:close', (event) => {
  BrowserWindow.fromWebContents(event.sender)?.close()
})

// 두 번째 인스턴스의 sweep 이 살아 있는 첫 인스턴스의 worktree 를 지울 수 있다 (리뷰 Important 6)
if (!app.requestSingleInstanceLock()) {
  app.quit()
}

registerAgentHost()
registerAuth()
registerCliVersion()
registerSettingsStore()

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  // 화면이 없으면 지켜볼 이유도 없다 — 터미널의 일은 앱과 무관하게 계속된다
  killAllAgents()
  if (process.platform !== 'darwin') app.quit()
})
