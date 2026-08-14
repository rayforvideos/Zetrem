import { spawn } from 'node:child_process'
import type { ChildProcessWithoutNullStreams } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { app, ipcMain } from 'electron'
import { agentEnv } from '../src/shared/lib/shell-env'
import { agentArgs } from '../src/entities/agent-session/model/run-config'
import type { RunConfig } from '../src/entities/agent-session/model/run-config'
import { orchestratorPrompt, persona } from './agent-style'
import { loginPath } from './login-path'
import { recallProject } from './project-memory'

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
    if (agent !== 'starting') agent.kill()
  }
  agents.clear()
}

export function registerAgentHost(): void {
  ipcMain.handle(
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

    const project = await recallProject()
    if (agents.get(id) !== 'starting') return

    const workspace = project ?? join(app.getPath('userData'), 'agent-workspace')
    if (!project) mkdirSync(workspace, { recursive: true })

    const child = spawn(
      'claude',
      agentArgs({ ...config, persona: persona(), orchestrator: orchestratorPrompt() }),
      { cwd: workspace, env: agentEnv(process.env, await loginPath()) },
    )
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

  ipcMain.on('agent:send', (_event, id: string, text: string) => {
    if (typeof id !== 'string' || typeof text !== 'string') return
    const agent = agents.get(id)
    if (agent && agent !== 'starting') agent.stdin.write(userMessage(text))
  })

  ipcMain.on('agent:permission', (_event, id: string, requestId: string, result: unknown) => {
    if (typeof id !== 'string' || typeof requestId !== 'string') return
    const agent = agents.get(id)
    if (agent && agent !== 'starting') agent.stdin.write(permissionResponse(requestId, result))
  })

  ipcMain.on('agent:stop', (_event, id: string) => {
    if (typeof id !== 'string') return
    const agent = agents.get(id)
    agents.delete(id)
    if (agent && agent !== 'starting') agent.kill()
  })

  app.on('before-quit', () => {
    killAllAgents()
  })
}
