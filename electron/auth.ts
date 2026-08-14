import { execFile, spawn } from 'node:child_process'
import { promisify } from 'node:util'
import { ipcMain } from 'electron'
import type { WebContents } from 'electron'
import { agentEnv } from '../src/shared/lib/shell-env'
import { loginPath } from './login-path'

const execFileAsync = promisify(execFile)

export type AuthStatus = {
  loggedIn: boolean
  email?: string
  orgName?: string
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
    return { loggedIn: false, missing: code === 'ENOENT' }
  }
}

export function registerAuth(): void {
  ipcMain.handle('auth:status', () => readAuthStatus())

  ipcMain.handle('auth:login', async (event): Promise<AuthStatus> => {
    const sender: WebContents = event.sender
    const env = agentEnv(process.env, await loginPath())
    await new Promise<void>((resolve) => {
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
