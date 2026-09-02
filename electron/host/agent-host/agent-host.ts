import { spawn } from 'node:child_process'
import type { ChildProcessWithoutNullStreams } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { app } from 'electron'
import { agentEnv } from '../../spawn/shell-env/shell-env'
import { agentArgs } from '@/entities/claude-cli/api/run-config/run-config'
import { PERSONA, orchestratorPrompt } from '@/entities/teammate/model/orchestrator/orchestrator'
import { claudeBin, loginPath } from '../../cli/login-path/login-path'
import { exitReason, startTrouble } from '../../spawn/exit-reason/exit-reason'
import type { ExitReason } from '@/entities/claude-cli/lib/exit-line/exit-line.types'
import { recallProject } from '../../store/project-memory/project-memory'
import { librarySessionArgs } from '../../library/library'
import { handle, on, push } from '../../ipc/ipc'
import { lineReader } from '../../spawn/line-reader/line-reader'
import { killTree, killTreeSync } from '../../spawn/kill-tree/kill-tree'
import { goneWatch } from '../../spawn/gone/gone'
import { accountWorkInFlight } from '../../spawn/account-work/account-work'
import { errorTail } from '../../spawn/error-tail/error-tail'
import { tell } from '../tell/tell'
import { runConfigOf } from '../run-config-guard/run-config-guard'
import { launchFor } from '../../spawn/spawn-claude/spawn-claude'
import { scratchWorkspace } from '../../shell/workspace-dir/workspace-dir'
import { isGitWorkspace } from '../../shell/git-workspace/git-workspace'
import { followWorktrees, liveDeps as worktreeLinkDeps } from '../worktree-links/worktree-links'
import { dropSends, holdSend, releaseSends } from '../pending-sends/pending-sends'
import type { PendingSend } from '../pending-sends/pending-sends.types'

const agents = new Map<string, ChildProcessWithoutNullStreams | 'starting'>()
const waiting = new Map<string, PendingSend[]>()
// Children told to stop and not yet gone. SIGTERM is asked first; one that is
// still here after the grace period is killed where the stop was a stop for its
// own sake, and one alive at quit is killed too.
const dying = new Set<ChildProcessWithoutNullStreams>()
// The grace period a stop for its own sake is counting, kept per child so that
// a later stop can start counting for one an earlier stop only asked.
const hardStops = new Map<ChildProcessWithoutNullStreams, ReturnType<typeof setTimeout>>()
const STOP_GRACE_MS = 5000
const quiet = goneWatch()

type Picture = { mediaType: string | null; data: string | null }

function pictures(files: unknown): Picture[] {
  if (!Array.isArray(files)) return []
  return (files as Picture[]).filter(
    (file) => typeof file?.data === 'string' && typeof file?.mediaType === 'string',
  )
}

function userMessage(text: string, files: unknown = []): string {
  const shown = pictures(files).map((file) => ({
    type: 'image',
    source: { type: 'base64', media_type: file.mediaType, data: file.data },
  }))
  return `${JSON.stringify({
    type: 'user',
    message: { role: 'user', content: [...shown, { type: 'text', text }] },
  })}\n`
}

function permissionResponse(requestId: string, result: unknown): string {
  return `${JSON.stringify({
    type: 'control_response',
    response: { subtype: 'success', request_id: requestId, response: result },
  })}\n`
}

export function killAllAgents(): void {
  for (const agent of agents.values()) {
    if (agent === 'starting' || agent.pid === undefined) continue
    killTreeSync(agent.pid)
  }
  for (const child of dying) {
    if (child.pid !== undefined) killTreeSync(child.pid)
  }
  for (const timer of hardStops.values()) clearTimeout(timer)
  hardStops.clear()
  agents.clear()
  dying.clear()
  waiting.clear()
}

// `escalate` is what tells a stop asked for its own sake from one asked so that
// something else can happen: an account change that a session refuses to make
// way for is refused itself, and the turn goes on living rather than being
// killed for a change that then did not happen.
function stopChild(child: ChildProcessWithoutNullStreams, escalate: boolean): void {
  if (child.pid === undefined) return
  const { pid } = child
  if (!dying.has(child)) {
    dying.add(child)
    child.once('close', () => {
      clearTimeout(hardStops.get(child))
      hardStops.delete(child)
      dying.delete(child)
      quiet.note(dying.size === 0)
    })
  }
  killTree(pid)
  if (!escalate || hardStops.has(child)) return
  hardStops.set(
    child,
    setTimeout(() => {
      if (dying.has(child)) killTreeSync(pid)
    }, STOP_GRACE_MS),
  )
}

// Every session this app spawned, told to stop and then waited for. A live
// claude refreshes its own OAuth tokens into the credentials all the accounts
// share, so one that outlives an account change writes the account that just
// left over the one that just arrived. The answer says whether they really
// went: the caller has nothing safe to do with a child that is still there,
// and one still there is left running rather than killed for nothing.
// A child that stays keeps its id: it is still the session writing into that
// pane, so the stop the refusal asks the person for has to find it there, and
// its own close is what finally lets the next account operation through.
export async function stopAllAgents(waitMs: number): Promise<boolean> {
  for (const [id, agent] of [...agents]) {
    if (agent === 'starting') {
      agents.delete(id)
      dropSends(waiting, id)
      continue
    }
    stopChild(agent, false)
  }
  return quiet.within(dying.size === 0, waitMs)
}

export function registerAgentHost(): void {
  handle(
    'agent:start',
    async (event, id: unknown, prompt: unknown, config: unknown, files: unknown = []) => {
      const sender = event.sender
      const fail = (reason: ExitReason | null): void => {
        if (typeof id === 'string')
          push(sender, 'agent:event', { id, kind: 'exit', code: -1, reason })
      }
      if (typeof id !== 'string' || typeof prompt !== 'string') return fail(null)
      if (agents.has(id)) return
      if (!/^[A-Za-z0-9-]+$/.test(id)) return fail(null)
      // The credentials this session would run on are being moved; the pane
      // shows the same exit it shows for any session that could not start.
      if (accountWorkInFlight()) return fail(startTrouble('an account change is in progress'))
      const run = runConfigOf(config)
      if (run === null) return fail(startTrouble('the run settings were not usable'))

      agents.set(id, 'starting')

      let child: ChildProcessWithoutNullStreams
      let workspace: string
      try {
        const project = await recallProject()
        workspace = project ?? scratchWorkspace(app.getPath('userData'))
        let added: string[] = []
        try {
          added = await librarySessionArgs(workspace)
        } catch (cause: unknown) {
          console.error('[library] could not lay out', workspace, cause)
        }
        // Whether a teammate can be fenced into a worktree is the workspace's
        // to answer, so it is answered here and never taken from the renderer.
        const isolated = isGitWorkspace(workspace)
        // A teammate fenced into a worktree gets a fresh checkout with no
        // node_modules of its own; this links the main checkout's in, never
        // blocking the spawn below on it.
        if (isolated) {
          followWorktrees(workspace, worktreeLinkDeps).catch((cause: unknown) => {
            console.error('[worktree-links] could not follow', workspace, cause)
          })
        }
        const launch = launchFor(await claudeBin(), [
          ...agentArgs({
            ...run,
            persona: PERSONA,
            orchestrator: orchestratorPrompt(isolated),
            isolated,
          }),
          ...added,
        ])
        const env = agentEnv(process.env, await loginPath())

        // Nothing below may await: the spawn and the map entry have to happen
        // in one uninterrupted step, or a stop can land between them.
        if (agents.get(id) !== 'starting') {
          dropSends(waiting, id)
          return fail(null)
        }
        if (!project) mkdirSync(workspace, { recursive: true })
        child = spawn(launch.command, launch.args, { cwd: workspace, env, windowsHide: true })
        agents.set(id, child)
      } catch (cause: unknown) {
        console.error(`[agent ${id}] could not start`, cause)
        agents.delete(id)
        dropSends(waiting, id)
        return fail(startTrouble(cause instanceof Error ? cause.message : String(cause)))
      }
      child.stdin.on('error', () => undefined)
      child.stdout.setEncoding('utf8')
      child.stderr.setEncoding('utf8')
      push(sender, 'agent:event', { id, kind: 'workspace', cwd: workspace })

      const read = lineReader()
      // killTree walks the process table, so it happens once, not per chunk.
      let dropped = false
      child.stdout.on('data', (chunk: string) => {
        if (sender.isDestroyed()) {
          if (!dropped) stopChild(child, true)
          dropped = true
          return
        }
        for (const line of read.take(chunk)) {
          push(sender, 'agent:event', { id, kind: 'line', line })
        }
      })
      let lastError = ''
      child.stderr.on('data', (chunk: string) => {
        lastError = errorTail(lastError, chunk)
      })

      // 'error' and 'close' can both fire for one child, and the id may already
      // belong to a later agent by the time either does.
      let reported = false
      const reportExit = (code: number | null, reason: ExitReason | null): void => {
        if (reported) return
        reported = true
        if (agents.get(id) === child) agents.delete(id)
        push(sender, 'agent:event', { id, kind: 'exit', code, reason })
      }
      // 'close' rather than 'exit': stdio has flushed by then, so the last lines
      // and the stderr that explains the exit are in hand.
      child.on('close', (code) => {
        if (code !== 0 && lastError) console.error(`[agent ${id}] stderr:`, lastError)
        reportExit(code, exitReason(code, lastError, ''))
      })
      child.on('error', (cause: Error) => reportExit(-1, startTrouble(cause.message)))

      tell(child.stdin, userMessage(prompt, files))
      for (const send of releaseSends(waiting, id)) {
        tell(child.stdin, userMessage(send.text, send.files))
      }
    },
  )

  on('agent:send', (_event, id: unknown, text: unknown, files: unknown = []) => {
    if (typeof id !== 'string' || typeof text !== 'string') return
    const agent = agents.get(id)
    if (agent === 'starting') holdSend(waiting, id, { text, files })
    else if (agent) tell(agent.stdin, userMessage(text, files))
  })

  on('agent:permission', (_event, id: unknown, requestId: unknown, result: unknown) => {
    if (typeof id !== 'string' || typeof requestId !== 'string') return
    const agent = agents.get(id)
    if (agent && agent !== 'starting') tell(agent.stdin, permissionResponse(requestId, result))
  })

  on('agent:stop', (_event, id: unknown) => {
    if (typeof id !== 'string') return
    const agent = agents.get(id)
    agents.delete(id)
    dropSends(waiting, id)
    if (agent && agent !== 'starting') stopChild(agent, true)
  })
}
