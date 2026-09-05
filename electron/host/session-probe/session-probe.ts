import { readFile } from 'node:fs/promises'
import { app } from 'electron'
import { agentEnv } from '../../spawn/shell-env/shell-env'
import { probeArgs } from '@/entities/claude-cli/api/run-config/run-config'
import { runConfigOf } from '../run-config-guard/run-config-guard'
import { loadSettings } from '../../store/settings-store/settings-store'
import { PERSONA, orchestratorPrompt } from '@/entities/teammate/model/orchestrator/orchestrator'
import { claudeBin, loginPath } from '../../cli/login-path/login-path'
import { recallProject } from '../../store/project-memory/project-memory'
import { librarySessionArgs } from '../../library/library'
import { saveFile } from '../../store/save-file/save-file'
import { readKept, stillWorthShowing } from '../../store/usage-cache/usage-cache'
import { keptUsagePath } from '../../store/kept-usage/kept-usage'
import { accountChanges } from '../../cli/accounts/account-change/account-change'
import { accountHereNow } from '../../cli/accounts/register-accounts/register-accounts'
import type { KeptUsage } from '@/app/desk/desk.types'
import { workspaceDir } from '../../shell/workspace-dir/workspace-dir'
import { isGitWorkspace } from '../../shell/git-workspace/git-workspace'
import { handle } from '../../ipc/ipc'
import { killTreeSync } from '../../spawn/kill-tree/kill-tree'
import { accountWorkInFlight } from '../../spawn/account-work/account-work'
import { runSettled, trackChild, untrackChild } from '../../spawn/run-settled/run-settled'

const PROBE_TIMEOUT_MS = 30_000
const PROBE_BUFFER_MAX = 200_000
const REPORT_TIMEOUT_MS = 30_000
const REPORT_MAX = 100_000

// A probe reads the CLI's session for one project under one account. Both
// have to match for the answer to be worth handing to a second caller: a
// probe begun before an account change describes the account that left.
let inFlight: {
  project: string | null
  account: number
  answer: Promise<string | null>
} | null = null
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
    spawned: (pid) => {
      asking.add(pid)
      trackChild(pid)
    },
    settled: (pid) => {
      asking.delete(pid)
      untrackChild(pid)
    },
    timeout: { ms: PROBE_TIMEOUT_MS, answers: () => null },
    cap: { bytes: PROBE_BUFFER_MAX, answers: () => null },
    line: (line) => (isInit(line) ? line : undefined),
    exit: () => null,
    error: () => null,
    refused: () => null,
  })
}

function readReport(bin: string, cwd: string, env: NodeJS.ProcessEnv): Promise<string | null> {
  return runSettled<string | null>({
    bin,
    args: ['-p', '/usage'],
    cwd,
    env,
    killOnSettle: true,
    spawned: (pid) => {
      asking.add(pid)
      trackChild(pid)
    },
    settled: (pid) => {
      asking.delete(pid)
      untrackChild(pid)
    },
    timeout: { ms: REPORT_TIMEOUT_MS, answers: () => null },
    cap: { bytes: REPORT_MAX, answers: (text) => text.slice(0, REPORT_MAX) },
    exit: (code, text) => (code === 0 && text.length > 0 ? text : null),
    error: () => null,
    refused: () => null,
  })
}

// Whose account this reading is, worked out from the credentials that took
// it rather than from the CLI's status, which only echoes a file that lags a
// login by minutes. A login neither a slot nor the file can name is stamped
// nobody, so the bar reads again instead of showing it under a wrong name.
async function keep(report: string): Promise<void> {
  const who = await accountHereNow()
  await saveFile(keptUsagePath(), JSON.stringify({ report, atMs: Date.now(), who })).catch(
    () => undefined,
  )
}

export function registerSessionProbe(): void {
  handle('session:probe', async (_event, config: unknown): Promise<string | null> => {
    const run = runConfigOf(config)
    if (run === null) return null
    // The tick that asks every minute must not put a claude in the middle of
    // an account change; it answers with nothing learned, as it does anyway
    // when the probe finds no session.
    if (accountWorkInFlight()) return null
    const project = await recallProject()
    const account = accountChanges()
    if (inFlight !== null && inFlight.project === project && inFlight.account === account)
      return inFlight.answer
    const answer = (async () => {
      const workspace = await workspaceDir(project, app.getPath('userData'))
      let added: string[] = []
      try {
        added = await librarySessionArgs(workspace, '')
      } catch (cause: unknown) {
        console.error('[library] could not lay out', workspace, cause)
      }
      const isolated = isGitWorkspace(workspace)
      const args = [
        ...probeArgs({
          ...run,
          persona: PERSONA,
          // The probe reads back what the CLI answers, never hands off work, so
          // there is nobody out in the shared tree for it to be warned about.
          orchestrator: orchestratorPrompt(isolated, []),
          isolated,
        }),
        ...added,
      ]
      const env = agentEnv(process.env, await loginPath(), (await loadSettings()).passEnv)
      return readInit(await claudeBin(), args, workspace, env)
    })().catch(() => null)
    const mine = { project, account, answer }
    inFlight = mine
    const found = await answer
    if (inFlight === mine) inFlight = null
    return found
  })

  handle('usage:kept', async (): Promise<KeptUsage | null> => {
    const kept = readKept(await readFile(keptUsagePath(), 'utf8').catch(() => ''))
    if (kept === null || !stillWorthShowing(kept, Date.now())) return null
    return { report: kept.report, who: kept.who }
  })

  handle('session:usage', async (): Promise<string | null> => {
    if (accountWorkInFlight()) return null
    if (reporting !== null) return reporting
    reporting = (async () => {
      const workspace = await workspaceDir(await recallProject(), app.getPath('userData'))
      const env = agentEnv(process.env, await loginPath(), (await loadSettings()).passEnv)
      return readReport(await claudeBin(), workspace, env)
    })().catch(() => null)
    const said = await reporting
    reporting = null
    if (said !== null) await keep(said)
    return said
  })
}
