import { execFile, spawn } from 'node:child_process'
import { promisify } from 'node:util'
import type { WebContents } from 'electron'
import { agentEnv } from '@/shared/lib/shell-env/shell-env'
import type { AuthStatus } from '@/entities/auth'
import { claudeBin, loginPath } from './login-path/login-path'
import { handle } from './ipc/ipc'

const execFileAsync = promisify(execFile)

export async function readAuthStatus(): Promise<AuthStatus> {
  try {
    const { stdout } = await execFileAsync(await claudeBin(), ['auth', 'status', '--json'], {
      env: agentEnv(process.env, await loginPath()),
    })
    const parsed = JSON.parse(stdout) as Record<string, unknown>
    if (parsed.loggedIn !== true) return { state: 'signed-out' }
    return {
      state: 'signed-in',
      email: typeof parsed.email === 'string' ? parsed.email : '',
      orgName: typeof parsed.orgName === 'string' ? parsed.orgName : null,
    }
  } catch (cause) {
    const code = (cause as { code?: string }).code
    return { state: code === 'ENOENT' ? 'cli-missing' : 'signed-out' }
  }
}

export function registerAuth(): void {
  handle('auth:status', () => readAuthStatus())

  handle('auth:logout', async (): Promise<AuthStatus> => {
    const env = agentEnv(process.env, await loginPath())
    let failure: string | null = null
    try {
      await execFileAsync(await claudeBin(), ['auth', 'logout'], { env })
    } catch (cause) {
      const error = cause as { stderr?: string; message?: string }
      failure = (error.stderr || error.message || 'claude auth logout failed').trim()
    }
    const status = await readAuthStatus()
    if (status.state === 'signed-in' && failure !== null) throw new Error(failure)
    return status
  })

  handle('auth:login', async (event): Promise<AuthStatus> => {
    const sender: WebContents = event.sender
    const env = agentEnv(process.env, await loginPath())
    const bin = await claudeBin()
    await new Promise<void>((resolve) => {
      const child = spawn(bin, ['auth', 'login'], {
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      child.stdout.setEncoding('utf8')
      child.stderr.setEncoding('utf8')
      const relay = (chunk: string): void => {
        if (!sender.isDestroyed()) sender.send('auth:progress', chunk)
      }
      child.stdout.on('data', relay)
      child.stderr.on('data', relay)
      child.on('exit', () => resolve())
      child.on('error', () => resolve())
    })
    return readAuthStatus()
  })
}
