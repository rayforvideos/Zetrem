import { realpathSync } from 'node:fs'
import { homedir } from 'node:os'
import { net } from 'electron'
import { managerOf } from '@/entities/agent-session/model/cli-update/cli-update'
import { agentEnv } from '../../spawn/shell-env/shell-env'
import { claudeBin, findCommand, loginPath } from '../login-path/login-path'
import { handle } from '../../ipc/ipc'
import { runSettled, trackChild, untrackChild } from '../../spawn/run-settled/run-settled'

const REGISTRY = 'https://registry.npmjs.org/@anthropic-ai/claude-code/latest'

const FETCH_TIMEOUT_MS = 5000

const UPDATE_TIMEOUT_MS = 180_000

const VERSION = /\d+(?:\.\d+)+/

const PROBE_TIMEOUT_MS = 5000

function probe(command: string, args: string[], path: string): Promise<string | null> {
  return runSettled<string | null>({
    bin: command,
    args,
    // A packaged app inherits `/` as its directory; ask from somewhere the user owns.
    cwd: homedir(),
    env: agentEnv(process.env, path),
    timeout: { ms: PROBE_TIMEOUT_MS, answers: () => null },
    exit: (_code, text) => text,
    error: () => null,
  })
}

export async function latestVersion(): Promise<string | null> {
  try {
    // Node's own fetch ignores HTTP_PROXY, so behind a corporate proxy it
    // would fail forever and read as "up to date". Chromium's stack honours
    // the system proxy.
    const response = await net.fetch(REGISTRY, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
    if (!response.ok) return null
    const body = (await response.json()) as { version?: unknown }
    return typeof body.version === 'string' ? body.version : null
  } catch {
    return null
  }
}

async function manager(): Promise<string | null> {
  const found = findCommand('claude', await loginPath())
  if (found === null) return null
  try {
    return managerOf(realpathSync(found))
  } catch {
    return managerOf(found)
  }
}

async function installedVersion(): Promise<string | null> {
  const out = await probe(await claudeBin(), ['--version'], await loginPath())
  return out === null ? null : (VERSION.exec(out)?.[0] ?? null)
}

export function registerCliVersion(): void {
  handle('cli:latest', async () => {
    const [installed, latest, managedBy] = await Promise.all([
      installedVersion(),
      latestVersion(),
      manager(),
    ])
    return { installed, latest, managedBy }
  })

  handle('cli:update', async () => {
    const path = await loginPath()
    return runSettled<{ output: string }>({
      bin: await claudeBin(),
      args: ['update'],
      cwd: homedir(),
      env: agentEnv(process.env, path),
      mergeStderr: true,
      spawned: trackChild,
      settled: untrackChild,
      timeout: {
        ms: UPDATE_TIMEOUT_MS,
        answers: (text) => ({
          output:
            `${text.trim().slice(-2000)}\nUpdate did not finish within 3 minutes and was stopped — try running claude update in your terminal`.trim(),
        }),
      },
      exit: (_code, text) => ({ output: text.trim().slice(-2000) }),
      error: () => ({ output: 'claude command not found' }),
    })
  })
}
