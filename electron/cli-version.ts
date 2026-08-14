import { spawn } from 'node:child_process'
import { realpathSync } from 'node:fs'
import { ipcMain } from 'electron'
import { managerOf } from '../src/entities/agent-session/model/cli-update'
import { agentEnv } from '../src/shared/lib/shell-env'
import { loginPath } from './login-path'

const REGISTRY = 'https://registry.npmjs.org/@anthropic-ai/claude-code/latest'

const FETCH_TIMEOUT_MS = 5000

const UPDATE_TIMEOUT_MS = 180_000

const VERSION = /\d+(?:\.\d+)+/

const PROBE_TIMEOUT_MS = 5000

function probe(command: string, args: string[], path: string): Promise<string | null> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { env: agentEnv(process.env, path) })
    let out = ''
    let settled = false
    const settle = (value: string | null): void => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(value)
    }
    const timer = setTimeout(() => {
      child.kill('SIGTERM')
      settle(null)
    }, PROBE_TIMEOUT_MS)
    child.stdout.on('data', (chunk: Buffer) => {
      out += chunk.toString('utf8')
    })
    child.on('error', () => settle(null))
    child.on('exit', () => settle(out))
  })
}

async function latestVersion(): Promise<string | null> {
  try {
    const response = await fetch(REGISTRY, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
    if (!response.ok) return null
    const body = (await response.json()) as { version?: unknown }
    return typeof body.version === 'string' ? body.version : null
  } catch {
    return null
  }
}

async function manager(): Promise<string | null> {
  const out = await probe('which', ['claude'], await loginPath())
  const found = out?.trim() ?? ''
  if (found.length === 0) return null
  try {
    return managerOf(realpathSync(found))
  } catch {
    return managerOf(found)
  }
}

async function installedVersion(): Promise<string | null> {
  const out = await probe('claude', ['--version'], await loginPath())
  return out === null ? null : (VERSION.exec(out)?.[0] ?? null)
}

export function registerCliVersion(): void {
  ipcMain.handle('cli:latest', async () => {
    const [installed, latest, managedBy] = await Promise.all([
      installedVersion(),
      latestVersion(),
      manager(),
    ])
    return { installed, latest, managedBy }
  })

  ipcMain.handle('cli:update', async () => {
    const path = await loginPath()
    return new Promise<{ output: string }>((resolve) => {
      const child = spawn('claude', ['update'], { env: agentEnv(process.env, path) })
      let output = ''
      const take = (chunk: Buffer): void => {
        output += chunk.toString('utf8')
      }
      let settled = false
      const settle = (text: string): void => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve({ output: text })
      }
      const timer = setTimeout(() => {
        child.kill('SIGTERM')
        settle(
          `${output.trim().slice(-2000)}\n갱신이 3분 안에 끝나지 않아 멈췄습니다 — 터미널에서 claude update 를 직접 돌려 보세요`.trim(),
        )
      }, UPDATE_TIMEOUT_MS)
      child.stdout.on('data', take)
      child.stderr.on('data', take)
      child.on('error', () => settle('claude 명령을 찾지 못했습니다'))
      child.on('exit', () => settle(output.trim().slice(-2000)))
    })
  })
}
