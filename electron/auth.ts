import { execFile, spawn } from 'node:child_process'
import { promisify } from 'node:util'
import { ipcMain } from 'electron'
import type { WebContents } from 'electron'
import { agentEnv } from '../src/shared/lib/shell-env'
import { loginPath } from './login-path'

const execFileAsync = promisify(execFile)

/**
 * 로그인 — 앱을 처음 켠 사람이 먼저 지나는 문.
 *
 * 이 앱은 로그인을 직접 하지 않는다. CLI 가 이미 그 일을 하고(브라우저 OAuth), 계정 정보는
 * CLI 의 것이다. 우리는 상태를 묻고(`claude auth status --json`), 필요하면 로그인을 띄우고
 * (`claude auth login`), 끝나면 다시 물을 뿐이다. 자격 증명을 우리가 만지지 않는 것이
 * 이 설계의 핵심이다 — 만지는 순간 우리가 보안 경계가 된다.
 */
export type AuthStatus = {
  loggedIn: boolean
  email?: string
  orgName?: string
  /** claude 를 아예 못 찾은 경우 — 설치 안내를 화면에 낸다 */
  missing?: boolean
}

export async function readAuthStatus(): Promise<AuthStatus> {
  try {
    const { stdout } = await execFileAsync('claude', ['auth', 'status', '--json'], {
      env: agentEnv(process.env, await loginPath()),
    })
    const parsed = JSON.parse(stdout) as Record<string, unknown>
    return {
      loggedIn: parsed.loggedIn === true,
      email: typeof parsed.email === 'string' ? parsed.email : undefined,
      orgName: typeof parsed.orgName === 'string' ? parsed.orgName : undefined,
    }
  } catch (cause) {
    const code = (cause as { code?: string }).code
    // ENOENT 는 "claude 가 없다" 이고, 나머지는 "로그인 안 됨" 이다 — 화면의 안내가 다르다
    return { loggedIn: false, missing: code === 'ENOENT' }
  }
}

export function registerAuth(): void {
  ipcMain.handle('auth:status', () => readAuthStatus())

  ipcMain.handle('auth:login', async (event): Promise<AuthStatus> => {
    const sender: WebContents = event.sender
    const env = agentEnv(process.env, await loginPath())
    await new Promise<void>((resolve) => {
      // 로그인은 브라우저에서 끝난다. CLI 가 URL 을 열고 콜백을 기다리므로 우리는 기다리기만 한다
      const child = spawn('claude', ['auth', 'login'], {
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      const relay = (chunk: Buffer): void => {
        if (!sender.isDestroyed()) sender.send('auth:progress', chunk.toString('utf8'))
      }
      child.stdout.on('data', relay)
      child.stderr.on('data', relay)
      child.on('exit', () => resolve())
      child.on('error', () => resolve())
    })
    return readAuthStatus()
  })
}
