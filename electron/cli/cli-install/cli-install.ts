import { homedir } from 'node:os'
import { agentEnv } from '@/shared/lib/shell-env/shell-env'
import { readAuthStatus } from '../auth/auth'
import { handle } from '../../ipc/ipc'
import { loginPath, resetLoginPath } from '../login-path/login-path'
import { runSettled, trackChild, untrackChild } from '../../spawn/run-settled/run-settled'

const INSTALL_TIMEOUT_MS = 300_000

export function installerCommand(platform: string = process.platform): {
  bin: string
  args: string[]
} {
  if (platform === 'win32') {
    return {
      bin: 'powershell.exe',
      args: [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        'irm https://claude.ai/install.ps1 | iex',
      ],
    }
  }
  return { bin: '/bin/bash', args: ['-c', 'curl -fsSL https://claude.ai/install.sh | bash'] }
}

export function registerCliInstall(): void {
  handle('cli:install', async () => {
    const { bin, args } = installerCommand()
    const output = await runSettled<string>({
      bin,
      args,
      // A packaged app inherits `/` as its directory; ask from somewhere the user owns.
      cwd: homedir(),
      env: agentEnv(process.env, await loginPath()),
      mergeStderr: true,
      spawned: trackChild,
      settled: untrackChild,
      timeout: {
        ms: INSTALL_TIMEOUT_MS,
        then: (text) =>
          `${text.trim()}\nThe install did not finish within 5 minutes and was stopped`.trim(),
      },
      exit: (_code, text) => text,
      error: (cause) => cause.message,
    })
    // The PATH was read before the binary existed; read the world again.
    resetLoginPath()
    const status = await readAuthStatus()
    return { status, output: output.trim().slice(-2000) }
  })
}
