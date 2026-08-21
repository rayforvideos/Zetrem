import { spawn } from 'node:child_process'
import type { ChildProcessWithoutNullStreams } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { app } from 'electron'
import { agentEnv } from '@/shared/lib/shell-env/shell-env'
import { agentArgs } from '@/entities/agent-session/model/run-config/run-config'
import type { RunConfig } from '@/entities/agent-session/model/run-config/run-config.types'
import { ORCHESTRATOR_PROMPT, PERSONA } from '@/entities/agent-session/model/orchestrator/orchestrator'
import { claudeBin, loginPath } from '../login-path/login-path'
import { exitReason, startTrouble } from '../exit-reason/exit-reason'
import type { ExitReason } from '../exit-reason/exit-reason.types'
import { recallProject } from '../project-memory'
import { handle, on } from '../ipc/ipc'
import { lineReader } from '../line-reader/line-reader'
import { killTree, killTreeSync } from '../kill-tree/kill-tree'
import { errorTail } from '../error-tail/error-tail'
import { tell } from '../tell/tell'
import { launchFor } from '../spawn-claude/spawn-claude'
import { dropSends, holdSend, releaseSends } from '../pending-sends/pending-sends'
import type { PendingSend } from '../pending-sends/pending-sends.types'

const agents = new Map<string, ChildProcessWithoutNullStreams | 'starting'>()
const waiting = new Map<string, PendingSend[]>()


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
  agents.clear()
  waiting.clear()
}

export function registerAgentHost(): void {
  handle(
    'agent:start',
    async (event, id: string, prompt: string, config: RunConfig, files: unknown = []) => {
    const sender = event.sender
    const fail = (reason: ExitReason | null): void => {
      if (typeof id === 'string' && !sender.isDestroyed()) {
        sender.send('agent:event', { id, kind: 'exit', code: -1, reason })
      }
    }
    if (typeof id !== 'string' || typeof prompt !== 'string') return fail(null)
    // An id that is already running belongs to a live agent. Reporting an exit
    // for it would tell the renderer that agent died, so say nothing instead.
    if (agents.has(id)) return
    if (!/^[A-Za-z0-9-]+$/.test(id)) return fail(null)

    agents.set(id, 'starting')

    let child: ChildProcessWithoutNullStreams
    let workspace: string
    try {
      const project = await recallProject()
      workspace = project ?? join(app.getPath('userData'), 'agent-workspace')
      const launch = launchFor(
        await claudeBin(),
        agentArgs({ ...config, persona: PERSONA, orchestrator: ORCHESTRATOR_PROMPT }),
      )
      const env = agentEnv(process.env, await loginPath())

      // A stop that lands while this was waiting only removes the map entry, so
      // the last word on whether to spawn is here. Nothing below may await:
      // the spawn and the map entry have to happen in one uninterrupted step.
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
    if (!sender.isDestroyed()) sender.send('agent:event', { id, kind: 'workspace', cwd: workspace })

    const read = lineReader()
    // killTree walks the process table, so the kill for a window that went away
    // happens once rather than on every chunk still in flight.
    let dropped = false
    child.stdout.on('data', (chunk: string) => {
      if (sender.isDestroyed()) {
        if (!dropped && child.pid !== undefined) killTree(child.pid)
        dropped = true
        return
      }
      for (const line of read.take(chunk)) {
        sender.send('agent:event', { id, kind: 'line', line })
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
      if (!sender.isDestroyed()) sender.send('agent:event', { id, kind: 'exit', code, reason })
    }
    // 'close' rather than 'exit': stdio has flushed by then, so the last lines
    // and the stderr that explains the exit are in hand.
    child.on('close', (code) => {
      if (code !== 0 && lastError) console.error(`[agent ${id}] stderr:`, lastError)
      reportExit(code, exitReason(code, lastError, ''))
    })
    child.on('error', (cause: Error) => reportExit(-1, startTrouble(cause.message)))

    tell(child.stdin, userMessage(prompt, files))
    // Anything typed during the start waited for this stdin, and it has to
    // follow the opening prompt rather than race ahead of it.
    for (const send of releaseSends(waiting, id)) {
      tell(child.stdin, userMessage(send.text, send.files))
    }
    },
  )

  on('agent:send', (_event, id: string, text: string, files: unknown = []) => {
    if (typeof id !== 'string' || typeof text !== 'string') return
    // An id nobody knows has no host coming, and the renderer starts a fresh
    // agent on its side, so text held for it would never be read.
    const agent = agents.get(id)
    if (agent === 'starting') holdSend(waiting, id, { text, files })
    else if (agent) tell(agent.stdin, userMessage(text, files))
  })

  on('agent:permission', (_event, id: string, requestId: string, result: unknown) => {
    if (typeof id !== 'string' || typeof requestId !== 'string') return
    const agent = agents.get(id)
    if (agent && agent !== 'starting') tell(agent.stdin, permissionResponse(requestId, result))
  })

  on('agent:stop', (_event, id: string) => {
    if (typeof id !== 'string') return
    const agent = agents.get(id)
    agents.delete(id)
    dropSends(waiting, id)
    if (agent && agent !== 'starting' && agent.pid !== undefined) killTree(agent.pid)
  })
}
