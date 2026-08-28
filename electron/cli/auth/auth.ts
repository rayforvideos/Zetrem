import { execFile, spawn } from 'node:child_process'
import { promisify } from 'node:util'
import type { WebContents } from 'electron'
import { agentEnv } from '../../spawn/shell-env/shell-env'
import type { AuthStatus } from '@/entities/auth'
import { lost, won } from '@/shared/lib/outcome/outcome'
import type { Outcome } from '@/shared/lib/outcome/outcome.types'
import { claudeBin, loginPath } from '../login-path/login-path'
import { authFailureOf, authStatusOf } from './auth-status/auth-status'
import { handle, push } from '../../ipc/ipc'
import { killTree } from '../../spawn/kill-tree/kill-tree'
import { trackChild, untrackChild } from '../../spawn/run-settled/run-settled'
import { launchFor } from '../../spawn/spawn-claude/spawn-claude'

const execFileAsync = promisify(execFile)

const LOGIN_TIMEOUT_MS = 5 * 60 * 1000
const STATUS_TIMEOUT_MS = 20_000
const LOGOUT_TIMEOUT_MS = 20_000

export async function readAuthStatus(): Promise<AuthStatus> {
  try {
    const { stdout } = await execFileAsync(await claudeBin(), ['auth', 'status', '--json'], {
      env: agentEnv(process.env, await loginPath()),
      timeout: STATUS_TIMEOUT_MS,
    })
    return authStatusOf(stdout)
  } catch (cause) {
    return authFailureOf(cause)
  }
}

export function registerAuth(): void {
  handle('auth:status', () => readAuthStatus())

  handle('auth:logout', async (): Promise<Outcome<AuthStatus>> => {
    const env = agentEnv(process.env, await loginPath())
    let failure: string | null = null
    try {
      await execFileAsync(await claudeBin(), ['auth', 'logout'], {
        env,
        timeout: LOGOUT_TIMEOUT_MS,
      })
    } catch (cause) {
      const error = cause as { stderr?: string; message?: string }
      failure = (error.stderr || error.message || 'claude auth logout failed').trim()
    }
    const status = await readAuthStatus()
    if (status.state === 'signed-in' && failure !== null) return lost('cli', failure)
    return won(status)
  })

  handle('auth:login', async (event): Promise<AuthStatus> => {
    const sender: WebContents = event.sender
    const env = agentEnv(process.env, await loginPath())
    const bin = await claudeBin()
    await new Promise<void>((resolve) => {
      const launch = launchFor(bin, ['auth', 'login'])
      const child = spawn(launch.command, launch.args, {
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      })
      child.stdout.setEncoding('utf8')
      child.stderr.setEncoding('utf8')
      if (child.pid !== undefined) trackChild(child.pid)
      let settled = false
      const stop = (): void => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        if (child.pid !== undefined) untrackChild(child.pid)
        resolve()
      }
      const timer = setTimeout(() => {
        if (child.pid !== undefined) killTree(child.pid)
        else child.kill()
        stop()
      }, LOGIN_TIMEOUT_MS)
      const relay = (chunk: string): void => push(sender, 'auth:progress', chunk)
      child.stdout.on('data', relay)
      child.stderr.on('data', relay)
      // 'close' rather than 'exit': stdio has flushed by then, so the last
      // progress line reaches the renderer before the status check answers.
      child.on('close', stop)
      child.on('error', stop)
    })
    return readAuthStatus()
  })
}
