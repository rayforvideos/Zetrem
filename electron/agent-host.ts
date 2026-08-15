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
import { recallProject } from './project-memory'
import { handle, on } from './ipc/ipc'
import { killTree, killTreeSync } from './kill-tree/kill-tree'
import { killAllProbes } from './session-probe'

const agents = new Map<string, ChildProcessWithoutNullStreams | 'starting'>()

const LINE_BUFFER_MAX = 1_000_000

function userMessage(text: string): string {
  return `${JSON.stringify({
    type: 'user',
    message: { role: 'user', content: [{ type: 'text', text }] },
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
    async (event, id: string, prompt: string, config: RunConfig) => {
    const sender = event.sender
    const fail = (): void => {
      if (typeof id === 'string' && !sender.isDestroyed()) {
        sender.send('agent:event', { id, kind: 'exit', code: -1 })
      }
    }
    if (typeof id !== 'string' || typeof prompt !== 'string') return fail()
    if (agents.has(id)) return fail()
    if (!/^[A-Za-z0-9-]+$/.test(id)) return fail()

    agents.set(id, 'starting')

    let child: ChildProcessWithoutNullStreams
    let workspace: string
    try {
      const project = await recallProject()
      if (agents.get(id) !== 'starting') return

      workspace = project ?? join(app.getPath('userData'), 'agent-workspace')
      if (!project) mkdirSync(workspace, { recursive: true })

      child = spawn(
        await claudeBin(),
        agentArgs({ ...config, persona: PERSONA, orchestrator: ORCHESTRATOR_PROMPT }),
        { cwd: workspace, env: agentEnv(process.env, await loginPath()) },
      )
    } catch (cause: unknown) {
      console.error(`[agent ${id}] could not start`, cause)
      agents.delete(id)
      return fail()
    }
    agents.set(id, child)
    if (!sender.isDestroyed()) sender.send('agent:event', { id, kind: 'workspace', cwd: workspace })

    let buffer = ''
    child.stdout.on('data', (chunk: Buffer) => {
      if (sender.isDestroyed()) {
        child.kill()
        return
      }
      buffer += chunk.toString('utf8')
      if (buffer.length > LINE_BUFFER_MAX) buffer = buffer.slice(-LINE_BUFFER_MAX)
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (line.trim().length === 0) continue
        sender.send('agent:event', { id, kind: 'line', line })
      }
    })
    let lastError = ''
    child.stderr.on('data', (chunk: Buffer) => {
      lastError = chunk.toString('utf8').slice(-2000)
    })
    child.on('exit', (code) => {
      agents.delete(id)
      if (code !== 0 && lastError) console.error(`[agent ${id}] stderr:`, lastError)
      if (!sender.isDestroyed()) sender.send('agent:event', { id, kind: 'exit', code })
    })
    child.on('error', () => {
      agents.delete(id)
      if (!sender.isDestroyed()) sender.send('agent:event', { id, kind: 'exit', code: -1 })
    })

    child.stdin.write(userMessage(prompt))
    },
  )

  on('agent:send', (_event, id: string, text: string) => {
    if (typeof id !== 'string' || typeof text !== 'string') return
    const agent = agents.get(id)
    if (agent && agent !== 'starting') agent.stdin.write(userMessage(text))
  })

  on('agent:permission', (_event, id: string, requestId: string, result: unknown) => {
    if (typeof id !== 'string' || typeof requestId !== 'string') return
    const agent = agents.get(id)
    if (agent && agent !== 'starting') agent.stdin.write(permissionResponse(requestId, result))
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
