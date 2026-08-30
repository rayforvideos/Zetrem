import { execFile, spawn } from 'node:child_process'
import { promisify } from 'node:util'
import type { WebContents } from 'electron'
import { agentEnv } from '../../spawn/shell-env/shell-env'
import type { AuthStatus } from '@/entities/auth'
import { lost, won } from '@/shared/lib/outcome/outcome'
import type { Outcome } from '@/shared/lib/outcome/outcome.types'
import { claudeBin, loginPath } from '../login-path/login-path'
import { accountWork } from '../accounts/account-guard/account-guard'
import { authFailureOf, authStatusOf } from './auth-status/auth-status'
import { handle, on, push } from '../../ipc/ipc'
import { killTree } from '../../spawn/kill-tree/kill-tree'
import { trackChild, untrackChild } from '../../spawn/run-settled/run-settled'
import { launchFor } from '../../spawn/spawn-claude/spawn-claude'

const execFileAsync = promisify(execFile)

const LOGIN_TIMEOUT_MS = 5 * 60 * 1000
const STATUS_TIMEOUT_MS = 20_000
const LOGOUT_TIMEOUT_MS = 20_000

export async function readAuthStatus(): Promise<AuthStatus> {
  try {
    const launch = launchFor(await claudeBin(), ['auth', 'status', '--json'])
    const { stdout } = await execFileAsync(launch.command, launch.args, {
      env: agentEnv(process.env, await loginPath()),
      timeout: STATUS_TIMEOUT_MS,
      windowsHide: true,
    })
    return authStatusOf(stdout)
  } catch (cause) {
    return authFailureOf(cause)
  }
}

export function registerAuth(): void {
  handle('auth:status', () => readAuthStatus())

  on('auth:cancel-login', () => cancelLogin())

  // Signing out writes the credentials every account is filed from, so it goes
  // the way every other account change goes: alone, with the children stopped
  // and the latch held, and the one signal raised when it took.
  handle(
    'auth:logout',
    (): Promise<Outcome<AuthStatus>> =>
      accountWork('auth:logout', async (stop) => {
        if (!(await stop()))
          return lost<AuthStatus>('timeout', 'a Claude Code process would not stop')
        const env = agentEnv(process.env, await loginPath())
        let failure: string | null = null
        try {
          const launch = launchFor(await claudeBin(), ['auth', 'logout'])
          await execFileAsync(launch.command, launch.args, {
            env,
            timeout: LOGOUT_TIMEOUT_MS,
            windowsHide: true,
          })
        } catch (cause) {
          const error = cause as { stderr?: string; message?: string }
          failure = (error.stderr || error.message || 'claude auth logout failed').trim()
        }
        const status = await readAuthStatus()
        if (status.state === 'signed-in' && failure !== null)
          return lost<AuthStatus>('cli', failure)
        return won(status)
      }),
  )

  handle('auth:login', async (event): Promise<AuthStatus> => {
    await runLogin(event.sender)
    return readAuthStatus()
  })
}

// An account operation runs alone and a login is the one thing inside it that
// waits on a person, so there is at most one child to reach: this is how the
// cancel finds it. Nothing running is nothing to do.
let stopCurrentLogin: (() => void) | null = null

function cancelLogin(): void {
  stopCurrentLogin?.()
}

export async function runLogin(sender: WebContents): Promise<void> {
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
      stopCurrentLogin = null
      if (child.pid !== undefined) untrackChild(child.pid)
      resolve()
    }
    // The browser page can hang for as long as it likes; the child is killed
    // here rather than waited on, so runLogin answers and the operation around
    // it takes its ordinary did-not-sign-in path.
    const halt = (): void => {
      if (child.pid !== undefined) killTree(child.pid)
      else child.kill()
      stop()
    }
    stopCurrentLogin = halt
    const timer = setTimeout(halt, LOGIN_TIMEOUT_MS)
    const relay = (chunk: string): void => push(sender, 'auth:progress', chunk)
    child.stdout.on('data', relay)
    child.stderr.on('data', relay)
    // 'close' rather than 'exit': stdio has flushed by then, so the last
    // progress line reaches the renderer before the status check answers.
    child.on('close', stop)
    child.on('error', stop)
  })
}
