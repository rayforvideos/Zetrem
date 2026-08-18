import { spawn } from 'node:child_process'
import type { ChildProcessWithoutNullStreams } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { app } from 'electron'
import { agentEnv } from '@/shared/lib/shell-env/shell-env'
import { agentArgs } from '@/entities/agent-session/model/run-config/run-config'
import type { RunConfig } from '@/entities/agent-session/model/run-config/run-config.types'
import { ORCHESTRATOR_PROMPT, PERSONA } from '@/entities/agent-session/model/orchestrator/orchestrator'
import { claudeBin, loginPath } from './login-path/login-path'
import { exitReason, startTrouble } from './exit-reason/exit-reason'
import type { ExitReason } from './exit-reason/exit-reason.types'
import { recallProject } from './project-memory'
import { handle, on } from './ipc/ipc'
import { lineReader } from './line-reader/line-reader'
import { killTree, killTreeSync } from './kill-tree/kill-tree'
import { tell } from './tell/tell'
import { killAllProbes } from './session-probe'
import { launchFor } from './spawn-claude/spawn-claude'

const agents = new Map<string, ChildProcessWithoutNullStreams | 'starting'>()


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
    if (agents.has(id)) return fail(null)
    if (!/^[A-Za-z0-9-]+$/.test(id)) return fail(null)

    agents.set(id, 'starting')

    let child: ChildProcessWithoutNullStreams
    let workspace: string
    try {
      const project = await recallProject()
        if (agents.get(id) !== 'starting') return fail(null)

      workspace = project ?? join(app.getPath('userData'), 'agent-workspace')
      if (!project) mkdirSync(workspace, { recursive: true })

      const launch = launchFor(
        await claudeBin(),
        agentArgs({ ...config, persona: PERSONA, orchestrator: ORCHESTRATOR_PROMPT }),
      )
      child = spawn(launch.command, launch.args, {
        cwd: workspace,
        env: agentEnv(process.env, await loginPath()),
      })
    } catch (cause: unknown) {
      console.error(`[agent ${id}] could not start`, cause)
      agents.delete(id)
      return fail(startTrouble(cause instanceof Error ? cause.message : String(cause)))
    }
    agents.set(id, child)
    child.stdin.on('error', () => undefined)
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    if (!sender.isDestroyed()) sender.send('agent:event', { id, kind: 'workspace', cwd: workspace })

    const read = lineReader()
    child.stdout.on('data', (chunk: string) => {
      if (sender.isDestroyed()) {
        child.kill()
        return
      }
      for (const line of read.take(chunk)) {
        sender.send('agent:event', { id, kind: 'line', line })
      }
    })
    let lastError = ''
    child.stderr.on('data', (chunk: string) => {
      lastError = chunk.slice(-2000)
    })
    child.on('exit', (code) => {
      agents.delete(id)
      if (code !== 0 && lastError) console.error(`[agent ${id}] stderr:`, lastError)
      const reason = exitReason(code, lastError, '')
      if (!sender.isDestroyed()) sender.send('agent:event', { id, kind: 'exit', code, reason })
    })
    child.on('error', (cause: Error) => {
      agents.delete(id)
      if (!sender.isDestroyed()) {
        sender.send('agent:event', { id, kind: 'exit', code: -1, reason: startTrouble(cause.message) })
      }
    })

    tell(child.stdin, userMessage(prompt, files))
    },
  )

  on('agent:send', (_event, id: string, text: string, files: unknown = []) => {
    if (typeof id !== 'string' || typeof text !== 'string') return
    const agent = agents.get(id)
    if (agent && agent !== 'starting') tell(agent.stdin, userMessage(text, files))
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
    if (agent && agent !== 'starting' && agent.pid !== undefined) killTree(agent.pid)
  })

  app.on('before-quit', () => {
    killAllAgents()
    killAllProbes()
  })
}
