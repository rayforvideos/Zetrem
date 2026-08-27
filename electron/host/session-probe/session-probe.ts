import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { app } from 'electron'
import { agentEnv } from '../../spawn/shell-env/shell-env'
import { probeArgs } from '@/entities/claude-cli/api/run-config/run-config'
import { runConfigOf } from '../run-config-guard/run-config-guard'
import { ORCHESTRATOR_PROMPT, PERSONA } from '@/entities/teammate/model/orchestrator/orchestrator'
import { claudeBin, loginPath } from '../../cli/login-path/login-path'
import { recallProject } from '../../store/project-memory/project-memory'
import { saveFile } from '../../store/save-file/save-file'
import { readKept, stillWorthShowing } from '../../store/usage-cache/usage-cache'
import { workspaceDir } from '../../shell/workspace-dir/workspace-dir'
import { handle } from '../../ipc/ipc'
import { killTreeSync } from '../../spawn/kill-tree/kill-tree'
import { runSettled } from '../../spawn/run-settled/run-settled'

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

function readInit(
  bin: string,
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
): Promise<string | null> {
  return runSettled<string | null>({
    bin,
    args,
    cwd,
    env,
    killOnSettle: true,
    spawned: (pid) => asking.add(pid),
    settled: (pid) => asking.delete(pid),
    timeout: { ms: PROBE_TIMEOUT_MS, answers: () => null },
    cap: { bytes: PROBE_BUFFER_MAX, answers: () => null },
    line: (line) => (isInit(line) ? line : undefined),
    exit: () => null,
    error: () => null,
  })
}

function readReport(bin: string, cwd: string, env: NodeJS.ProcessEnv): Promise<string | null> {
  return runSettled<string | null>({
    bin,
    args: ['-p', '/usage'],
    cwd,
    env,
    killOnSettle: true,
    spawned: (pid) => asking.add(pid),
    settled: (pid) => asking.delete(pid),
    timeout: { ms: REPORT_TIMEOUT_MS, answers: () => null },
    cap: { bytes: REPORT_MAX, answers: (text) => text.slice(0, REPORT_MAX) },
    exit: (code, text) => (code === 0 && text.length > 0 ? text : null),
    error: () => null,
  })
}

function keptPath(): string {
  return join(app.getPath('userData'), 'usage.json')
}

async function keep(report: string): Promise<void> {
  await saveFile(keptPath(), JSON.stringify({ report, atMs: Date.now() })).catch(() => undefined)
}

export function registerSessionProbe(): void {
  handle('session:probe', async (_event, config: unknown): Promise<string | null> => {
    const run = runConfigOf(config)
    if (run === null) return null
    if (inFlight !== null) return inFlight
    inFlight = (async () => {
      const workspace = await workspaceDir(await recallProject(), app.getPath('userData'))
      const args = probeArgs({ ...run, persona: PERSONA, orchestrator: ORCHESTRATOR_PROMPT })
      const env = agentEnv(process.env, await loginPath())
      return readInit(await claudeBin(), args, workspace, env)
    })().catch(() => null)
    const found = await inFlight
    inFlight = null
    return found
  })

  handle('usage:kept', async (): Promise<string | null> => {
    const kept = readKept(await readFile(keptPath(), 'utf8').catch(() => ''))
    return kept !== null && stillWorthShowing(kept, Date.now()) ? kept.report : null
  })

  handle('session:usage', async (): Promise<string | null> => {
    if (reporting !== null) return reporting
    reporting = (async () => {
      const workspace = await workspaceDir(await recallProject(), app.getPath('userData'))
      const env = agentEnv(process.env, await loginPath())
      return readReport(await claudeBin(), workspace, env)
    })().catch(() => null)
    const said = await reporting
    reporting = null
    if (said !== null) await keep(said)
    return said
  })
}
