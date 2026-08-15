import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { app } from 'electron'
import { agentEnv } from '@/shared/lib/shell-env/shell-env'
import { probeArgs } from '@/entities/agent-session/model/run-config/run-config'
import type { RunConfig } from '@/entities/agent-session/model/run-config/run-config.types'
import { ORCHESTRATOR_PROMPT, PERSONA } from '@/entities/agent-session/model/orchestrator/orchestrator'
import { claudeBin, loginPath } from './login-path/login-path'
import { recallProject } from './project-memory'
import { handle } from './ipc/ipc'
import { killTree, killTreeSync } from './kill-tree/kill-tree'

const PROBE_TIMEOUT_MS = 30_000
const PROBE_BUFFER_MAX = 200_000
const REPORT_TIMEOUT_MS = 30_000
const REPORT_MAX = 100_000

let inFlight: Promise<string | null> | null = null
let reporting: Promise<string | null> | null = null
const asking = new Set<number>()

export function killAllProbes(): void {
  for (const pid of asking) killTreeSync(pid)
  asking.clear()
}

function isInit(line: string): boolean {
  try {
    const parsed = JSON.parse(line) as Record<string, unknown>
    return parsed.type === 'system' && parsed.subtype === 'init'
  } catch {
    return false
  }
}

function readInit(bin: string, args: string[], cwd: string, env: NodeJS.ProcessEnv): Promise<string | null> {
  return new Promise((resolve) => {
    const child = spawn(bin, args, { cwd, env })
    if (child.pid !== undefined) asking.add(child.pid)
    let settled = false
    let buffer = ''

    const stop = (line: string | null): void => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      if (child.pid !== undefined) {
        asking.delete(child.pid)
        killTree(child.pid)
      }
      resolve(line)
    }
    const timer = setTimeout(() => stop(null), PROBE_TIMEOUT_MS)

    child.stdout.on('data', (chunk: Buffer) => {
      buffer += chunk.toString('utf8')
      if (buffer.length > PROBE_BUFFER_MAX) return stop(null)
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (isInit(line)) return stop(line)
      }
    })
    child.on('exit', () => stop(null))
    child.on('error', () => stop(null))
  })
}

function readReport(bin: string, cwd: string, env: NodeJS.ProcessEnv): Promise<string | null> {
  return new Promise((resolve) => {
    const child = spawn(bin, ['-p', '/usage'], { cwd, env })
    if (child.pid !== undefined) asking.add(child.pid)
    let settled = false
    let out = ''

    const stop = (text: string | null): void => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      if (child.pid !== undefined) {
        asking.delete(child.pid)
        killTree(child.pid)
      }
      resolve(text)
    }
    const timer = setTimeout(() => stop(null), REPORT_TIMEOUT_MS)

    child.stdout.on('data', (chunk: Buffer) => {
      out += chunk.toString('utf8')
      if (out.length > REPORT_MAX) stop(out.slice(0, REPORT_MAX))
    })
    child.on('exit', (code) => stop(code === 0 && out.length > 0 ? out : null))
    child.on('error', () => stop(null))
  })
}

export function registerSessionProbe(): void {
  handle('session:probe', async (_event, config: RunConfig): Promise<string | null> => {
    if (inFlight !== null) return inFlight
    inFlight = (async () => {
      const project = await recallProject()
      const workspace = project ?? join(app.getPath('userData'), 'agent-workspace')
      const args = probeArgs({ ...config, persona: PERSONA, orchestrator: ORCHESTRATOR_PROMPT })
      const env = agentEnv(process.env, await loginPath())
      return readInit(await claudeBin(), args, workspace, env)
    })().catch(() => null)
    const found = await inFlight
    inFlight = null
    return found
  })

  handle('session:usage', async (): Promise<string | null> => {
    if (reporting !== null) return reporting
    reporting = (async () => {
      const project = await recallProject()
      const workspace = project ?? join(app.getPath('userData'), 'agent-workspace')
      const env = agentEnv(process.env, await loginPath())
      return readReport(await claudeBin(), workspace, env)
    })().catch(() => null)
    const said = await reporting
    reporting = null
    return said
  })
}
