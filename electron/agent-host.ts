import { spawn } from 'node:child_process'
import type { ChildProcessWithoutNullStreams } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { app, ipcMain } from 'electron'
import { agentEnv } from '../src/shared/lib/shell-env'
import { agentArgs } from '../src/entities/agent-session/model/run-config'
import type { RunConfig } from '../src/entities/agent-session/model/run-config'
import { persona } from './agent-style'
import { loginPath } from './login-path'
import { recallProject } from './project-memory'

/**
 * CLI 에이전트 프로세스의 집. 렌더러는 샌드박스라 spawn 을 못 하므로
 * 프로세스 수명은 전부 여기 소유다. 렌더러와는 agent:* 채널로만 말한다.
 *
 * 출력은 해석하지 않고 줄 단위로 그대로 넘긴다 — stream-json 을 도메인 이벤트로
 * 번역하는 것은 렌더러의 순수 파서(entities/agent-session/api/claude/parse.ts) 몫이다.
 *
 * 'starting' 은 spawn 전의 자리표시다. start 가 첫 await 를 넘기 전에
 * stop 이 도착하는 경합에서, 자리표시가 없으면 stop 이 무시되고
 * 그 뒤의 spawn 이 아무도 못 죽이는 고아가 된다 (리뷰 Critical 2).
 */
const agents = new Map<string, ChildProcessWithoutNullStreams | 'starting'>()

/** stdout 재조립 버퍼 상한. CLI 가 개행 없는 거대 출력을 내도 메인 메모리가 자라지 않게 */
const LINE_BUFFER_MAX = 1_000_000

/** stream-json 입력 한 줄 — Claude Code CLI 의 user 메시지 형식 */
function userMessage(text: string): string {
  return `${JSON.stringify({
    type: 'user',
    message: { role: 'user', content: [{ type: 'text', text }] },
  })}\n`
}

/**
 * 권한 질문(control_request)에 대한 응답 한 줄 (CLI 2.1.229 실측).
 * result 의 내용({behavior: allow|deny, ...})은 렌더러의 순수 파서가 만든다 —
 * 여기는 봉투(control_response)만 씌운다.
 */
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
      // 조용히 return 하면 타일이 working 에 영영 머문다 (리뷰 Important 7)
      if (typeof id === 'string' && !sender.isDestroyed()) {
        sender.send('agent:event', { id, kind: 'exit', code: -1 })
      }
    }
    if (typeof id !== 'string' || typeof prompt !== 'string') return fail()
    if (agents.has(id)) return fail()
    // 브랜치 이름이 곧 경로 조각이 된다 — 렌더러가 준 id 를 파일시스템에 쓰기 전에 거른다
    if (!/^[A-Za-z0-9-]+$/.test(id)) return fail()

    agents.set(id, 'starting')

    // 사용자가 고른 프로젝트에서 일한다. 경로의 진실은 메인 쪽 기억 파일이라
    // 렌더러가 임의 cwd 를 주입할 창구가 없다. 프로젝트가 없으면 격리된 모래밭
    const project = await recallProject()
    if (agents.get(id) !== 'starting') return // 시작하는 사이 stop 이 왔다

    // 사람이 고른 프로젝트에서 그대로 일한다. worktree 격리는 걷어냈다 —
    // 이 앱은 이제 사람이 지켜보며 대화하는 자리이고, 격리는 사람이 원할 때 하는 일이다
    const workspace = project ?? join(app.getPath('userData'), 'agent-workspace')
    if (!project) mkdirSync(workspace, { recursive: true })

    // 인자는 사람이 첫 화면에서 고른 것에서 나온다 (권한 모드·모델) — 조합의 정합성은
    // run-config 의 테스트가 지킨다
    const child = spawn('claude', agentArgs({ ...config, persona: persona() }), {
      cwd: workspace,
      env: agentEnv(process.env, await loginPath()),
    })
    agents.set(id, child)
    if (!sender.isDestroyed()) sender.send('agent:event', { id, kind: 'workspace', cwd: workspace })

    // stdout 은 청크 경계가 줄 경계와 다르다 — 여기서 줄로 재조립해서 넘긴다
    let buffer = ''
    child.stdout.on('data', (chunk: Buffer) => {
      // 화면이 사라진 에이전트는 존재 이유가 없다 — 버퍼만 키우지 말고 끝낸다 (리뷰 Important 5)
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
    // stderr 를 읽지 않으면 파이프가 차서 CLI 가 write 에서 멈춘다 (리뷰 Important 3)
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
      // spawn 실패(CLI 미설치 등)도 exit 으로 보고한다 — 렌더러 쪽 처리 경로를 하나로 유지
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
    // 창이 닫혀도 자식이 살아남으면 고아 프로세스가 토큰을 계속 쓴다
    killAllAgents()
  })
}
